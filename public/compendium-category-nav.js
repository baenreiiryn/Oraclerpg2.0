(()=>{
'use strict';
const categories=document.getElementById('categories');if(!categories||categories.closest('.category-nav'))return;
const wrap=document.createElement('div');wrap.className='category-nav';categories.parentNode.insertBefore(wrap,categories);wrap.appendChild(categories);
const left=document.createElement('button'),right=document.createElement('button');for(const [b,dir,label,glyph] of [[left,-1,'Categorias anteriores','‹'],[right,1,'Próximas categorias','›']]){b.type='button';b.className='category-nav-arrow';b.dataset.dir=String(dir);b.setAttribute('aria-label',label);b.textContent=glyph;wrap.appendChild(b);b.addEventListener('click',()=>categories.scrollBy({left:dir*Math.max(220,categories.clientWidth*.72),behavior:'smooth'}))}
function sync(){const max=Math.max(0,categories.scrollWidth-categories.clientWidth),overflow=max>6;wrap.classList.toggle('has-overflow',overflow);left.disabled=categories.scrollLeft<=4;right.disabled=categories.scrollLeft>=max-4}
categories.addEventListener('scroll',sync,{passive:true});new ResizeObserver(sync).observe(categories);new MutationObserver(()=>requestAnimationFrame(sync)).observe(categories,{childList:true});
categories.addEventListener('wheel',event=>{const max=categories.scrollWidth-categories.clientWidth;if(max<=4)return;const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;if(!delta)return;const before=categories.scrollLeft;categories.scrollLeft+=delta;if(categories.scrollLeft!==before)event.preventDefault()},{passive:false});
let down=false,startX=0,startScroll=0,moved=false,pointerId=null;
categories.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')return;down=true;moved=false;pointerId=event.pointerId;startX=event.clientX;startScroll=categories.scrollLeft;categories.classList.add('is-dragging');categories.setPointerCapture?.(pointerId)});
categories.addEventListener('pointermove',event=>{if(!down||event.pointerId!==pointerId)return;const dx=event.clientX-startX;if(Math.abs(dx)>4)moved=true;categories.scrollLeft=startScroll-dx});
function stop(event){if(!down)return;down=false;categories.classList.remove('is-dragging');try{categories.releasePointerCapture?.(pointerId)}catch{}pointerId=null;sync()}
categories.addEventListener('pointerup',stop);categories.addEventListener('pointercancel',stop);categories.addEventListener('lostpointercapture',stop);
categories.addEventListener('click',event=>{if(!moved)return;event.preventDefault();event.stopImmediatePropagation();moved=false},true);
sync();
})();
