import paramiko
import sys
import traceback
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

host = '2.26.80.138'
username = 'root'
password = 'qF9{t2b^{C'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, username=username, password=password, look_for_keys=False, allow_agent=False, timeout=15, banner_timeout=10)

    def run(cmd):
        stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        return out, err

    print("=== IPv6 test ===")
    out, err = run('ping -c 2 -w 3 149.154.166.110 2>&1 | head -5; echo "---"; ping6 -c 2 -w 3 2001:67c:4e8:f004::9 2>&1 | head -5; echo "---"; curl -4 -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://api.telegram.org/bot8468257998:AAFLf6uUIzlM4--r03287OJFuvJ79hebMaE/getMe" 2>&1; echo; curl -6 -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://api.telegram.org/bot8468257998:AAFLf6uUIzlM4--r03287OJFuvJ79hebMaE/getMe" 2>&1; echo')
    print(out)
    
    print("=== Proxy env vars ===")
    out, err = run('echo "HTTP_PROXY=$HTTP_PROXY"; echo "HTTPS_PROXY=$HTTPS_PROXY"; echo "http_proxy=$http_proxy"; echo "https_proxy=$https_proxy"; echo "NO_PROXY=$NO_PROXY"')
    print(out)

    print("=== Grammy version ===")
    out, err = run('cat /opt/helperdesktop/node_modules/grammy/package.json 2>/dev/null | grep '"version"' | head -1')
    print(out)

    print("=== Grammy dependencies ===")
    out, err = run("cat /opt/helperdesktop/node_modules/grammy/package.json 2>/dev/null | grep -A 30 '\"dependencies\"' | head -35")
    print(out)

    print("=== Test getMe via node native fetch ===")
    out, err = run("node -e \"fetch('https://api.telegram.org/bot8468257998:AAFLf6uUIzlM4--r03287OJFuvJ79hebMaE/getMe').then(r=>r.json()).then(d=>console.log(JSON.stringify(d))).catch(e=>console.error(e.message))\" 2>&1")
    print(out)

    print("=== Test Grammy getMe via CommonJS require ===")
    out, err = run("cd /opt/helperdesktop/apps/bot && node -e \"const {Bot} = require('./node_modules/grammy'); const b = new Bot('8468257998:AAFLf6uUIzlM4--r03287OJFuvJ79hebMaE'); b.api.getMe().then(console.log).catch(e => console.error('Err:', e.message, 'Code:', e.code, 'Desc:', e.description))\" 2>&1")
    print(out)

    print("=== Test with https module directly ===")
    out, err = run("node -e \"const h=require('https'); const r=h.get('https://api.telegram.org/bot8468257998:AAFLf6uUIzlM4--r03287OJFuvJ79hebMaE/getMe',(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>console.log(res.statusCode,d.slice(0,200)))}); r.on('error',e=>console.error(e.message)); r.setTimeout(5000,()=>{console.log('timeout');r.destroy()})\" 2>&1")
    print(out)

    print("=== Check for undici or fetch-related config ===")
    out, err = run("cat /opt/helperdesktop/node_modules/grammy/package.json 2>/dev/null | grep -iE 'deno|undici|node-fetch|cross-fetch|fetch' | head -10")
    print(out)

    print("=== NODE_OPTIONS env ===")
    out, err = run("echo \$NODE_OPTIONS")
    print(out)

    print("=== Check if node --dns-result-order=ipv4first helps ===")
    out, err = run("cd /opt/helperdesktop/apps/bot && timeout 10 bash -c 'BOT_TOKEN=\"8468257998:AAFLf6uUIzlM4--r03287OJFuvJ79hebMaE\" BOT_AUTOSTART=1 NODE_OPTIONS=\"--dns-result-order=ipv4first\" node dist/index.js' 2>&1 || echo \"EXIT_CODE=\$?\"")
    print(out)

    client.close()
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    traceback.print_exc()
