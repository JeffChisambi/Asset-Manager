const fs = require('fs');
const path = require('path');

async function main(){
  try{
    const supabasePath = path.join(__dirname, '..', 'lib', 'supabase.ts');
    const text = fs.readFileSync(supabasePath, 'utf8');
    const urlMatch = text.match(/const\s+supabaseUrl\s*=\s*['"](https?:\/\/[^'\"]+)['"]/);
    const keyMatch = text.match(/const\s+supabaseAnonKey\s*=\s*['"]([^'\"]+)['"]/);
    if(!urlMatch){
      console.error('Could not find supabaseUrl in lib/supabase.ts');
      process.exit(2);
    }
    const url = urlMatch[1];
    const key = keyMatch ? keyMatch[1] : null;

    console.log('Supabase URL:', url);
    if(key) console.log('Supabase anon key: (found)');

    const endpoints = [
      url,
      url + '/rest/v1',
      url + '/auth/v1',
      url + '/health'
    ];

    for(const e of endpoints){
      try{
        const res = await fetch(e, { method: 'GET', headers: key ? { apikey: key } : {} , redirect: 'manual' });
        console.log(`GET ${e} -> ${res.status} ${res.statusText}`);
        const t = await res.text().catch(()=>null);
        if(t) console.log('Response snippet:', t.slice(0,200));
      }catch(err){
        console.error(`Error fetching ${e}:`, err.message || err);
      }
    }

    // DNS lookup
    const dns = require('dns');
    const u = new URL(url);
    dns.lookup(u.hostname, (err, address, family) => {
      if(err) console.error('DNS lookup error:', err.message || err);
      else console.log('DNS lookup:', u.hostname, address, 'family', family);
    });
  }catch(err){
    console.error('Script error:', err);
    process.exit(1);
  }
}

main();
