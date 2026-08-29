(() => {
  const initialized = new WeakSet();
  const init = (root=document) => root.querySelectorAll('[data-ch-quiz]').forEach((quiz) => {
    if (initialized.has(quiz)) return; initialized.add(quiz);
    const steps=[...quiz.querySelectorAll('[data-ch-quiz-step]')]; let current=0;
    const show=(index) => { current=Math.max(0,Math.min(index,steps.length-1)); steps.forEach((step,i)=>{step.hidden=i!==current}); quiz.querySelector('[data-ch-quiz-progress]').value=current+1; };
    quiz.addEventListener('click',(event)=>{ const action=event.target.closest('[data-ch-quiz-action]')?.dataset.chQuizAction; if(action==='next')show(current+1); if(action==='back')show(current-1); if(action==='restart'){quiz.reset();show(0);} }); show(0);
  });
  document.addEventListener('DOMContentLoaded',()=>init()); document.addEventListener('shopify:section:load',(event)=>init(event.target));
})();
