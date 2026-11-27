/**
 * Inline, render-blocking flag so elements meant to animate in don't flash
 * before hydration. Skipped for reduced-motion users and when effects are off.
 * A timeout reveals everything if the entrance never runs.
 */
export function MotionFlag() {
  const code = `(function(){try{var d=document.documentElement;var off=false;try{off=localStorage.getItem('eic-effects')==='off'}catch(e){}if(off)d.classList.add('effects-off');if(!off&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('js-motion');setTimeout(function(){d.classList.add('motion-timeout')},3500)}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
