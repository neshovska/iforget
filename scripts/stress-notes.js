// scripts/stress-notes.js — правдоподобни тестови бележки за stress-test.js:
// част приключени, част в прогрес, разпределени назад във времето, с
// подбележки на всяка трета.
module.exports = function makeNotes(n) {
  const out = []; const now = Date.now(); const DAY = 86400000;
  const texts = ['Да се обадя за офертата и да проверя сроковете','Плексиглас за витрината — да питам за цена','Вентилатор за склада, размери и монтаж','Закачалка и рафтове за новото помещение','Да се боядисат стените преди петък'];
  for (let i=0;i<n;i++){
    const createdAt = now - Math.floor(i/6)*DAY - (i%6)*3600000;
    const st = i%5===0?'done':(i%3===0?'progress':'open');
    const note = {id:'n'+i,text:texts[i%texts.length]+' #'+i,createdAt,ts:createdAt,status:st,
      tag:i%4===0?'work':(i%7===0?'personal':null),color:null,reminderAt:null,reminderRepeat:null,subs:[]};
    if(st==='done') note.doneAt = createdAt+3600000;
    if(i%3===0) note.subs=[{id:'s'+i+'a',text:'подточка едно',status:'open',createdAt,color:null,reminderAt:null,reminderRepeat:null},
                           {id:'s'+i+'b',text:'подточка две',status:'done',createdAt,doneAt:createdAt+1000,color:null,reminderAt:null,reminderRepeat:null}];
    out.push(note);
  }
  return out;
};
