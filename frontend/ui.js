window.UI={
  current:null, transitioning:false,
  async transitionToScreen(id){
    const next=document.querySelector('#'+id);if(!next||this.current===id)return;
    const old=this.current&&document.querySelector('#'+this.current);this.transitioning=true;
    if(old){old.classList.add('screen-leaving');document.body.classList.add('petal-sweep');await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?0:240));old.hidden=true;old.classList.remove('screen-leaving')}
    document.querySelectorAll('.screen').forEach(screen=>{if(screen!==next)screen.hidden=true});next.hidden=false;next.classList.add('screen-entering');this.current=id;
    requestAnimationFrame(()=>requestAnimationFrame(()=>next.classList.remove('screen-entering')));setTimeout(()=>{document.body.classList.remove('petal-sweep');this.transitioning=false;(next.querySelector('input,button,[tabindex]')||next).focus?.({preventScroll:true})},420);
  },
  show(id){return this.transitionToScreen(id)},
  error(message){const el=document.querySelector('#error');el.textContent=message;el.hidden=!message},
  escape(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},
  connection(ok){document.querySelectorAll('.connection').forEach(el=>{el.className='connection '+(ok?'online':'offline');el.textContent=ok?'● На зв’язку':'○ Перепідключення…'})}
};
window.transitionToScreen=(screenName)=>UI.transitionToScreen(screenName);
