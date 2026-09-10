"""UI wallet integration test: test-only EIP1193 double; public chain reads real; no signing."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:3001')
parser.add_argument('--output', required=True)
a = parser.parse_args()
provider = """(() => {
 const listeners = {}; window.__walletCalls = []; window.__chain = '0x1';
 window.__account = '0x0000000000000000000000000000000000000001';
 window.__emit = (name) => (listeners[name] || []).forEach(fn => fn());
 window.ethereum = {
 on: (name, fn) => { (listeners[name] ||= []).push(fn); },
 removeListener: (name, fn) => { listeners[name] = (listeners[name] || []).filter(x => x !== fn); },
 request: async ({method,params}) => {
 window.__walletCalls.push(method);
 if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [window.__account];
 if (method === 'eth_chainId') return window.__chain;
 if (method === 'wallet_switchEthereumChain') {window.__chain = params[0].chainId; window.__emit('chainChanged'); return null;}
 throw Error('Test provider refuses signatures and transactions: ' + method);
 }
 };
})()"""
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    page = b.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(a.url, wait_until='domcontentloaded')
    page.get_by_role('button', name='Connect wallet', exact=True).click()
    page.get_by_text('No injected wallet found.', exact=False).wait_for()
    page.evaluate(provider)
    page.get_by_role('button', name='Connect wallet', exact=True).click()
    page.get_by_role('button', name='Switch to Base', exact=True).wait_for()
    page.get_by_role('button', name='Switch to Base', exact=True).click()
    page.wait_for_function("document.querySelector('.balance-value') !== null", timeout=90000)
    page.locator('#buy-amount').fill('1')
    page.locator('button.primary').click()
    page.wait_for_function("document.body.innerText.includes('Quoter simulation returned.')", timeout=90000)
    assert page.get_by_role('button', name='1. Approve exact USDC', exact=True).is_disabled()
    assert page.get_by_role('button', name='2. Swap to NVDAc', exact=True).is_disabled()
    page.get_by_role('tab', name='SELL', exact=True).click()
    assert page.locator('#buy-amount').input_value() == ''
    assert page.locator('.quote-readout .value').inner_text() == 'Not quoted'
    page.locator('#buy-amount').fill('0.01')
    page.locator('button.primary').click()
    page.wait_for_function("document.body.innerText.includes('Quoter simulation returned.')", timeout=90000)
    assert page.get_by_role('heading', name='You receive / USDC', exact=True).is_visible()
    assert page.get_by_role('button', name='1. Approve exact NVDAc', exact=True).is_disabled()
    assert page.get_by_role('button', name='2. Swap to USDC', exact=True).is_disabled()
    page.locator('#slippage').fill('1.00')
    assert page.locator('.quote-readout .value').inner_text() == 'Not quoted'
    page.locator('#buy-amount').fill('2')
    assert page.locator('.quote-readout .value').inner_text() == 'Not quoted'
    page.evaluate("window.__account='0x0000000000000000000000000000000000000002'; window.__emit('accountsChanged')")
    page.wait_for_function("document.querySelector('.wallet-address')?.textContent.includes('0002')")
    page.get_by_role('button', name='Disconnect', exact=True).click()
    page.get_by_role('button', name='Connect wallet', exact=True).wait_for()
    page.locator('.tokens button').filter(has_text='AAPLc').click()
    page.get_by_label('Amount of AAPLc tokens', exact=True).wait_for()
    page.get_by_label('Amount of AAPLc tokens', exact=True).fill('2')
    calls = page.evaluate('window.__walletCalls')
    assert not any('send' in x.lower() or 'sign' in x.lower() for x in calls), calls
    assert not errors, errors
    geo = page.request.get(a.url + '/api/geo', headers={'x-vercel-ip-country':'TH','x-vercel-id':'forged'}).json()
    assert geo['allowed'] is False and geo['country'] is None
    result = {'provider':'test-only double; not a real wallet connection','real_public_reads':True,'checks':['no-wallet error','connect','wrong chain','switch Base','balance read','real BUY and SELL quotes','geo/builder-locked signing','direction and slippage invalidate quote','input invalidates quote','account event','disconnect','asset switch','spoofed geo denied'],'wallet_calls':calls,'page_errors':errors,'geo':geo}
    Path(a.output).write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result))
    b.close()
