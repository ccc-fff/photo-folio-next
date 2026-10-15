#!/usr/bin/env python3
"""Capture rushs teaser via CDP Page.startScreencast (full-chroma PNG).

Encodage à faire séparément via ffmpeg (cf. encode_v5.sh).
"""
import asyncio
import base64
import sys
from pathlib import Path
from playwright.async_api import async_playwright

VIEWPORT = {"width": 1080, "height": 1350}
DSF = 2  # retina → frames natives 2160×2700
BASE_URL = "https://fredericfornini.com"
OUT = Path("/tmp/photo-folio-rushes-v5")

PLANS = [
    {
        "name": "home",
        "url": "/",
        "actions": [("wait", 4500)],
    },
    {
        "name": "entrailles",
        "url": "/entrailles",
        "actions": [
            ("wait", 1800),
            ("key", "ArrowRight"), ("wait", 1500),
            ("key", "ArrowRight"), ("wait", 1500),
            ("key", "Escape"),     ("wait", 2200),
        ],
    },
    {
        "name": "dans-la-rue",
        "url": "/dans-la-rue",
        "actions": [
            ("wait", 1800),
            ("key", "ArrowRight"), ("wait", 1500),
            ("key", "ArrowRight"), ("wait", 1500),
            ("key", "Escape"),     ("wait", 2200),
        ],
    },
    {
        "name": "fiat-lux",
        "url": "/fiat-lux",
        "actions": [
            ("wait", 1800),
            ("key", "ArrowRight"), ("wait", 1500),
            ("key", "ArrowRight"), ("wait", 1500),
            ("key", "Escape"),     ("wait", 2200),
        ],
    },
]


async def capture_plan(browser, plan):
    out_dir = OUT / f"frames-{plan['name']}"
    out_dir.mkdir(parents=True, exist_ok=True)
    for f in out_dir.glob("*.png"):
        f.unlink()

    context = await browser.new_context(viewport=VIEWPORT, device_scale_factor=DSF)
    page = await context.new_page()
    cdp = await context.new_cdp_session(page)

    counter = {"n": 0}
    queue = asyncio.Queue()

    async def writer():
        while True:
            item = await queue.get()
            if item is None:
                queue.task_done()
                return
            n, data, sid = item
            (out_dir / f"frame-{n:05d}.png").write_bytes(data)
            try:
                await cdp.send("Page.screencastFrameAck", {"sessionId": sid})
            except Exception:
                pass
            queue.task_done()

    writer_task = asyncio.create_task(writer())

    def on_frame(event):
        n = counter["n"]
        counter["n"] += 1
        queue.put_nowait((n, base64.b64decode(event["data"]), event["sessionId"]))

    cdp.on("Page.screencastFrame", on_frame)

    await page.goto(BASE_URL + plan["url"], wait_until="networkidle")
    await page.wait_for_timeout(600)  # stabilisation post-load

    await cdp.send("Page.startScreencast", {
        "format": "png",
        "everyNthFrame": 1,
        "maxWidth": VIEWPORT["width"] * DSF,
        "maxHeight": VIEWPORT["height"] * DSF,
    })

    for action, value in plan["actions"]:
        if action == "wait":
            await page.wait_for_timeout(value)
        elif action == "key":
            await page.keyboard.press(value)

    await cdp.send("Page.stopScreencast")
    await page.wait_for_timeout(200)  # laisser drainer
    await queue.put(None)
    await writer_task
    await context.close()
    print(f"  {plan['name']}: {counter['n']} frames", flush=True)


async def main():
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for plan in PLANS:
            if only and plan["name"] not in only:
                continue
            print(f"Capture {plan['name']}...", flush=True)
            await capture_plan(browser, plan)
        await browser.close()
    print("OK", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
