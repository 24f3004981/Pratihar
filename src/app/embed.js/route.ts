import { env } from "@/lib/env";

/**
 * <script src="https://your-site/embed.js" data-business="abc123" async></script>
 * Adds a small "Call us" button that opens the receptionist in a panel.
 * If the business is on ElevenLabs, add data-agent="<agent id>" to use their widget instead.
 */
export const GET = () => {
  const js = `(function(){
  var s=document.currentScript; if(!s) return;
  var biz=s.getAttribute('data-business'); var agent=s.getAttribute('data-agent');
  var origin=${JSON.stringify(env.publicUrl)};
  if(agent){
    var w=document.createElement('elevenlabs-convai'); w.setAttribute('agent-id',agent); document.body.appendChild(w);
    var x=document.createElement('script'); x.src='https://unpkg.com/@elevenlabs/convai-widget-embed'; x.async=true; document.body.appendChild(x);
    return;
  }
  if(!biz) return;
  var b=document.createElement('button');
  b.textContent='Call us'; b.setAttribute('aria-label','Talk to our receptionist');
  b.style.cssText='position:fixed;right:20px;bottom:20px;z-index:2147483000;background:#1f1a14;color:#fbf6ec;border:0;border-radius:999px;padding:14px 20px;font:600 15px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer';
  var f=null;
  b.onclick=function(){
    if(f){f.remove();f=null;b.textContent='Call us';return;}
    f=document.createElement('iframe'); f.src=origin+'/talk/'+encodeURIComponent(biz)+'?embed=1';
    f.allow='microphone; autoplay'; f.title='Receptionist';
    f.style.cssText='position:fixed;right:20px;bottom:84px;width:min(380px,calc(100vw - 40px));height:min(600px,calc(100vh - 120px));border:0;border-radius:18px;z-index:2147483000;box-shadow:0 12px 40px rgba(0,0,0,.3);background:#fbf6ec';
    document.body.appendChild(f); b.textContent='Close';
  };
  document.body.appendChild(b);
})();`;
  return new Response(js, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=300" } });
};
