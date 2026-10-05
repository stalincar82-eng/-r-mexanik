/* Motornaya garage extras: compact UI, extra mechanical parts, paint and removed-parts tray. */
(function(){
  'use strict';
  if(window.__motornayaGarageUpgradesV2) return;
  window.__motornayaGarageUpgradesV2=true;

  var root=null, parts={}, colors={}, ready=false, activeCategory='other';
  var storageKey='motornaya-extra-garage-v2';

  function inGarage(){
    var b=document.querySelector('.mode-button[data-mode="workshop"].is-active');
    return !!b;
  }
  function findCar(){
    if(!window.scene||!window.THREE)return null;
    var best=null,bestDistance=Infinity;
    window.scene.traverse(function(o){
      if(best||!o.isGroup||!o.children.length)return;
      if(Math.abs(o.position.x-30)>5||Math.abs(o.position.z)>5)return;
      var box=new THREE.Box3().setFromObject(o); if(box.isEmpty())return;
      var s=box.getSize(new THREE.Vector3());
      if(s.x<8&&s.z<8&&s.y<5){
        var d=Math.abs(o.position.x-30)+Math.abs(o.position.z);
        if(d<bestDistance){best=o;bestDistance=d;}
      }
    });
    return best;
  }
  function mat(c,metal,rough){return new THREE.MeshStandardMaterial({color:c,metalness:metal||0,roughness:rough||.5});}
  function box(name,s,p,c,metal,rough){
    var m=new THREE.Mesh(new THREE.BoxGeometry(s[0],s[1],s[2]),mat(c,metal,rough));
    m.name=name; m.position.set(p[0],p[1],p[2]); m.castShadow=true; m.receiveShadow=true; return m;
  }
  function build(){
    if(ready)return;
    var car=findCar(); if(!car)return;
    root=new THREE.Group(); root.name='MotornayaGarageExtraParts'; car.add(root);
    parts.engine=box('Garage_Engine_Block',[1.35,.72,1.25],[0,.55,1.15],0x202421,.8,.28);
    parts.engine.add(box('Garage_Valve_Left',[.5,.12,1.05],[-.42,.44,0],0x4d514d,.75,.3),box('Garage_Valve_Right',[.5,.12,1.05],[.42,.44,0],0x4d514d,.75,.3));
    parts.engine.add(box('Garage_Intake',[.48,.22,.52],[0,.92,.05],0x8a8f89,.8,.24));
    parts.battery=box('Garage_Battery',[.42,.28,.55],[.78,.55,1.02],0x222523,.1,.55);
    parts.battery.add(box('Garage_Battery_Top',[.34,.05,.45],[0,.17,0],0x3b403c,.1,.5));
    parts.radiator=box('Garage_Radiator',[1.35,.62,.16],[0,.5,1.92],0x6b726d,.85,.3);
    parts.transmission=box('Garage_Transmission',[.62,.5,1.28],[0,.38,.05],0x505650,.82,.3);
    parts.transmission.add(new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.62,20),mat(0x2e332f,.8,.3)));
    Object.keys(parts).forEach(function(k){root.add(parts[k]);});
    ready=true; restore();
  }
  function save(){
    try{
      var s={parts:{}};
      Object.keys(parts).forEach(function(k){s.parts[k]=parts[k].visible!==false;});
      s.paint=colors.current||'';
      localStorage.setItem(storageKey,JSON.stringify(s));
    }catch(e){}
  }
  function restore(){
    try{
      var s=JSON.parse(localStorage.getItem(storageKey)||'null'); if(!s)return;
      Object.keys(parts).forEach(function(k){if(s.parts&&typeof s.parts[k]==='boolean')parts[k].visible=s.parts[k];});
      if(s.paint)paint(s.paint,false);
    }catch(e){}
  }
  function paint(hex,saveIt){
    var car=findCar(); if(!car)return;
    car.traverse(function(o){
      if(!o.isMesh||!o.material)return;
      var ms=Array.isArray(o.material)?o.material:[o.material];
      ms.forEach(function(m){
        if(!m||!m.color)return;
        var n=(o.name||'').toLowerCase();
        if(n.indexOf('tire')>=0||n.indexOf('rim')>=0||n.indexOf('glass')>=0||n.indexOf('chrome')>=0||n.indexOf('garage_')===0)return;
        m.color.set(hex);
      });
    });
    colors.current=hex; if(saveIt!==false)save();
  }

  function style(){
    if(document.getElementById('motornaya-garage-v2-style'))return;
    var s=document.createElement('style'); s.id='motornaya-garage-v2-style';
    s.textContent=[
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel{top:58px!important;right:auto!important;left:7px!important;bottom:54px!important;transform:none!important;width:205px!important;max-width:205px!important;max-height:calc(100% - 112px)!important;padding:7px!important;border-radius:9px!important;overflow:auto!important;box-shadow:0 8px 22px rgba(0,0,0,.28)!important}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .panel-heading{min-height:24px!important;align-items:center!important}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .panel-heading h2{font-size:13px!important;margin:0!important}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .panel-hint{display:none!important}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .condition-block{margin-top:6px!important;padding-top:5px!important}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-row{grid-template-columns:19px minmax(0,1fr) auto!important;gap:4px!important;min-height:35px!important;padding:3px!important;border-radius:6px!important}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-name{font-size:8px!important;line-height:1.05!important}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-state{font-size:6px!important}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-action{min-width:49px!important;min-height:26px!important;padding:0 4px!important;border-radius:5px!important;font-size:7px!important;touch-action:manipulation!important}',
      '#garage-safe-tabs{display:none!important}',
      '#garage-extra-content{position:fixed!important;z-index:10001!important;right:8px!important;left:auto!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;width:184px!important;max-width:184px!important;max-height:42vh!important;padding:7px!important;box-sizing:border-box!important;border-radius:8px!important;overflow:auto!important}',
      '#garage-removed-zone{position:fixed;z-index:10000;right:8px;bottom:55px;width:184px;max-width:184px;padding:5px 7px;box-sizing:border-box;border:1px solid rgba(224,239,226,.13);border-radius:7px;background:rgba(12,19,16,.88);color:#9eaaa1;font:800 7px Arial;pointer-events:none}',
      '#garage-removed-zone:empty{display:none}',
      '#garage-removed-zone strong{display:block;color:#d9f36a;font-size:7px;margin-bottom:2px}',
      '#garage-removed-zone span{display:inline-block;margin-right:5px}',
      '#garage-extra-content button{min-height:28px!important;border-radius:6px!important}',
      '#garage-category-ui{left:7px!important;right:7px!important;bottom:7px!important;gap:5px!important}',
      '#garage-category-ui .garage-bottom-tabs{gap:3px!important;padding:3px!important}',
      '#garage-category-ui button{height:34px!important;font-size:7px!important}',
      '#garage-category-ui .garage-other-tab{flex-basis:72px!important;min-width:72px!important}',
      '#garage-camera-controls{left:220px!important;top:58px!important;width:118px!important;padding:6px!important}',
      '#garage-camera-controls button{height:27px!important;font-size:12px!important}',
      '#garage-lift-controls{right:8px!important;top:58px!important;width:125px!important;padding:6px!important}',
      '#garage-diagnostics{right:8px!important;top:124px!important;width:125px!important;padding:6px!important}',
      '@media(max-width:700px){.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel{left:6px!important;top:56px!important;bottom:50px!important;width:165px!important;max-width:165px!important;max-height:calc(100% - 106px)!important;padding:5px!important}.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .panel-heading h2{font-size:11px!important}.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-row{grid-template-columns:17px minmax(0,1fr) auto!important;min-height:31px!important;gap:3px!important;padding:2px!important}.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-action{min-width:42px!important;min-height:23px!important;font-size:6px!important;padding:0 3px!important}#garage-extra-content{right:6px!important;width:145px!important;max-width:145px!important;max-height:38vh!important;padding:5px!important}#garage-removed-zone{right:6px;width:145px;max-width:145px;bottom:50px;font-size:6px}#garage-category-ui{left:5px!important;right:5px!important;bottom:5px!important}#garage-category-ui button{height:30px!important;font-size:6px!important;padding:0 3px!important}#garage-category-ui .garage-other-tab{flex-basis:58px!important;min-width:58px!important}#garage-camera-controls{left:178px!important;top:56px!important;width:104px!important}#garage-camera-controls button{height:24px!important;font-size:11px!important}#garage-lift-controls{right:6px!important;top:56px!important;width:112px!important}#garage-diagnostics{right:6px!important;top:112px!important;width:112px!important}},',
      '@media(max-width:430px){.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel{left:5px!important;width:150px!important;max-width:150px!important}.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-action{min-width:38px!important;font-size:5.5px!important}#garage-extra-content{right:5px!important;width:132px!important;max-width:132px!important}#garage-removed-zone{right:5px;width:132px;max-width:132px}#garage-camera-controls{left:160px!important;width:92px!important}#garage-lift-controls{right:5px!important;width:102px!important}#garage-diagnostics{right:5px!important;width:102px!important}}
    ].join('');
    document.head.appendChild(s);
  }

  function makeUI(){
    if(!document.getElementById('garage-extra-content')){
      var p=document.createElement('div'); p.id='garage-extra-content'; p.style.display='none';
      p.innerHTML='<div id="garage-extra-title" style="color:#d9f36a;letter-spacing:.7px;margin-bottom:5px;font-size:9px">ДЕТАЛИ</div><div id="garage-extra-body"></div>';
      document.body.appendChild(p);
      p.addEventListener('pointerdown',function(e){
        var b=e.target.closest&&e.target.closest('button[data-extra]'); if(!b)return;
        e.preventDefault(); e.stopPropagation(); var a=b.getAttribute('data-extra');
        if(parts[a]){
          if(a==='transmission' && !parts[a].visible){
            var car=findCar(); if(!car||car.position.y<0.55){showToast('Подними автомобиль на подъёмнике');return;}
          }
          parts[a].visible=!parts[a].visible; save(); renderExtra(activeCategory); updateRemoved();
        }else if(a.indexOf('paint:')===0){paint(a.slice(6)); renderExtra('paint');}
      },true);
    }
    if(!document.getElementById('garage-removed-zone')){
      var z=document.createElement('div'); z.id='garage-removed-zone'; document.body.appendChild(z);
    }
  }
  function button(id,label){
    var v=parts[id]&&parts[id].visible;
    return '<button type="button" data-extra="'+id+'" style="width:100%;margin:2px 0;padding:0 5px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055);color:#dfe7e0;font:800 8px Arial">'+(v?'СНЯТЬ ':'УСТАНОВИТЬ ')+label+'</button>';
  }
  function renderExtra(cat){
    var p=document.getElementById('garage-extra-content'); if(!p)return;
    if(!inGarage()||cat==='other'||cat==='wheels'){p.style.display='none';return;}
    var body=document.getElementById('garage-extra-body'),title=document.getElementById('garage-extra-title');
    if(cat==='engine'){
      title.textContent='ДВИГАТЕЛЬ';
      body.innerHTML=button('engine','Двигатель')+button('battery','Аккумулятор')+button('radiator','Радиатор');
    }else if(cat==='transmission'){
      title.textContent='КОРОБКА ПЕРЕДАЧ';
      body.innerHTML=button('transmission','Коробка передач')+'<div style="color:#8f9d94;font-size:7px;margin-top:4px">Снимать можно только на поднятом автомобиле.</div>';
    }else if(cat==='paint'){
      title.textContent='КРАСКА';
      body.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px"><button type="button" data-extra="paint:#101316" style="min-height:28px;background:#101316;color:#fff;border:1px solid #555;border-radius:6px;font:800 7px Arial">ЧЁРНЫЙ</button><button type="button" data-extra="paint:#c51f2a" style="min-height:28px;background:#c51f2a;color:#fff;border:1px solid #555;border-radius:6px;font:800 7px Arial">КРАСНЫЙ</button><button type="button" data-extra="paint:#164b8f" style="min-height:28px;background:#164b8f;color:#fff;border:1px solid #555;border-radius:6px;font:800 7px Arial">СИНИЙ</button><button type="button" data-extra="paint:#f0f0e8" style="min-height:28px;background:#f0f0e8;color:#111;border:1px solid #555;border-radius:6px;font:800 7px Arial">БЕЛЫЙ</button></div>';
    }else{p.style.display='none';return;}
    p.style.display='block';
  }
  function updateRemoved(){
    var z=document.getElementById('garage-removed-zone'); if(!z)return;
    if(!inGarage()){z.innerHTML='';return;}
    var names=[];
    var list=document.getElementById('parts-list');
    if(list){list.querySelectorAll('.part-row.is-removed').forEach(function(r){var n=r.querySelector('.part-name');if(n)names.push((n.textContent||'').replace(/Снята|Открыта|Установлена/g,'').trim());});}
    Object.keys(parts).forEach(function(k){if(!parts[k].visible)names.push(parts[k].label||k);});
    var uniq=[];names.forEach(function(n){if(n&&uniq.indexOf(n)<0)uniq.push(n);});
    z.innerHTML=uniq.length?'<strong>СНЯТЫЕ ДЕТАЛИ</strong><span>'+uniq.slice(0,6).join('</span><span>')+'</span>':'';
  }
  function hookCategory(){
    var ui=document.getElementById('garage-category-ui'); if(!ui||ui.__garageV2Hook)return;
    ui.__garageV2Hook=true;
    ui.addEventListener('pointerdown',function(e){
      var b=e.target.closest&&e.target.closest('[data-garage-category]'); if(!b)return;
      activeCategory=b.getAttribute('data-garage-category')||'other';
      window.setTimeout(function(){renderExtra(activeCategory);updateRemoved();},40);
    },false);
  }
  function loop(){
    style(); makeUI(); build(); hookCategory();
    var ui=document.getElementById('garage-category-ui');
    if(ui){var active=ui.querySelector('[data-garage-category].is-active');if(active)activeCategory=active.getAttribute('data-garage-category')||activeCategory;}
    var on=inGarage();
    var extra=document.getElementById('garage-extra-content'); if(extra&&!on)extra.style.display='none';
    var safe=document.getElementById('garage-safe-tabs'); if(safe)safe.style.display='none';
    if(on)renderExtra(activeCategory); else updateRemoved();
    updateRemoved();
    window.setTimeout(loop,500);
  }
  loop();
})();
