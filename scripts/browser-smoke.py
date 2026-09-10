"""Read-only real browser smoke. No wallet approvals or transactions."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:3001')
parser.add_argument('--output', required=True)
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for width, height in [(1440, 1000), (390, 844), (320, 740)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        response = page.goto(args.url, wait_until='domcontentloaded')
        page.get_by_role('heading', name='Dividend Lens', exact=True).wait_for(timeout=60000)
        page.wait_for_function("!document.body.innerText.includes('Loading live multiplier')", timeout=90000)
        page.wait_for_function("document.querySelector('.conversion .value') !== null", timeout=90000)
        assert page.locator('.verify[open]').count() == 0
        assert page.get_by_role('button').filter(has_text='Copy').count() == 0
        page.get_by_role('tab', name='SELL', exact=True).click()
        assert page.get_by_label('You pay / NVDAc', exact=True).is_visible()
        assert page.get_by_role('button', name='1. Approve exact NVDAc', exact=True).is_disabled()
        page.get_by_role('tab', name='SELL', exact=True).press('ArrowLeft')
        assert page.get_by_role('tab', name='BUY', exact=True).get_attribute('aria-selected') == 'true'
        page.locator('.verify summary').first.click()
        assert page.locator('.verify').first.locator('a').count() == 3
        page.locator('.verify summary').first.click()
        geometry = page.evaluate('''() => {
          const rect = s => { const r = document.querySelector(s).getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}; };
          const targets = [...document.querySelectorAll('button, input, summary, a')].filter(e => e.getClientRects().length).map(e => ({text:e.textContent, height:e.getBoundingClientRect().height}));
          return {stock:rect('.stock-list'), station:rect('.buy-station'), cards:rect('.market-hud'), targets};
        }''')
        assert all(t['height'] >= 44 for t in geometry['targets']), geometry
        if width > 700:
            assert geometry['stock']['right'] <= geometry['station']['x']
            assert geometry['cards']['y'] > geometry['station']['bottom']
        else:
            assert geometry['stock']['bottom'] <= geometry['station']['y']
        page.evaluate('window.scrollTo(0, 0)')
        page.screenshot(path=str(out / f'sharelens-{width}.png'), full_page=True)
        text = page.locator('body').inner_text()
        measurements = page.evaluate('({viewport:innerWidth, width:document.documentElement.scrollWidth})')
        controls = page.get_by_role('button').evaluate_all('(buttons)=>buttons.map(b=>({text:b.innerText,disabled:b.disabled}))')
        result = {'width': width, 'http': response.status, 'overflow': measurements['width'] > measurements['viewport'], 'page_errors': errors, 'geometry': geometry, 'controls': controls, 'text': text}
        assert response.status == 200
        assert not result['overflow'], measurements
        assert not errors, errors
        results.append(result)
        page.close()
    browser.close()
(out / 'browser-smoke.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps([{'width':r['width'],'http':r['http'],'overflow':r['overflow'],'page_errors':r['page_errors']} for r in results]))
