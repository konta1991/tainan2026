/* 台南 旅のしおり app.js */
(function(){
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const GEO = window.GEO || {};
  const SPOT = {}; SPOTS.forEach(s => { SPOT[s.id] = s; if (GEO[s.id]) { s.lat = GEO[s.id].lat; s.lng = GEO[s.id].lng; } });
  if (!SPOT.hotel.lat) { SPOT.hotel.lat = TRIP.hotel.lat; SPOT.hotel.lng = TRIP.hotel.lng; }
  const WD = ["日","月","火","水","木","金","土"];
  const mapsUrl = q => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q + " 台南");
  const navUrl = (q, mode) => "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(q + " 台南") + "&travelmode=" + (mode||"walking");
  const img = (f, cls) => f ? `<img class="${cls||""}" src="img/${f}" alt="" loading="lazy">` : "";

  // ---- 台湾時間 ----
  function taipeiNow(){
    const now = new Date();
    const p = new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",weekday:"short",hour12:false}).formatToParts(now);
    const o={}; p.forEach(x=>o[x.type]=x.value);
    return { y:+o.year, m:+o.month, d:+o.day, h:+o.hour, mi:+o.minute, wd:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(o.weekday), str:`${o.month}/${o.day}（${WD[["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(o.weekday)]}）${o.hour}:${o.minute}` };
  }
  const TN = taipeiNow();
  const QS = new URLSearchParams(location.search);
  if (QS.get("today")) { // 動作確認用：?today=2026-08-30T10:30
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(QS.get("today"));
    if (m) { TN.y=+m[1]; TN.m=+m[2]; TN.d=+m[3]; TN.h=+m[4]; TN.mi=+m[5]; TN.wd = new Date(Date.UTC(TN.y,TN.m-1,TN.d)).getUTCDay(); }
  }
  const tripDay = (()=>{ if (TN.y!==2026||TN.m!==8) return null; return {29:"sat",30:"sun",31:"mon"}[TN.d] || null; })();
  function closedToday(s){ return Array.isArray(s.closed) && s.closed.includes(TN.wd); }
  function closedLabel(s){ if(!s.closed||!s.closed.length) return ""; return s.closed.map(d=>WD[d]).join("・")+"休"; }

  // ---- topbar status ----
  (function(){
    const el = $("#topbar-status");
    const today = Date.UTC(TN.y, TN.m-1, TN.d), start = Date.UTC(2026,7,29), diff = Math.round((start-today)/86400000);
    let txt = diff > 0 ? `あと${diff}日` : tripDay ? "旅行中 DAY" + ({sat:1,sun:2,mon:3}[tripDay]) : "台南";
    el.textContent = txt + " ・ " + TN.m + "/" + TN.d + " " + String(TN.h).padStart(2,"0") + ":" + String(TN.mi).padStart(2,"0");
  })();

  // ---- navigation ----
  let mapInited = false;
  function show(view){
    $$(".view").forEach(v => v.hidden = (v.id !== view));
    $$("#bottomnav button").forEach(b => b.classList.toggle("on", b.dataset.view === view));
    if (view === "map") { initMap(); setTimeout(()=>MAP && MAP.invalidateSize(), 50); }
    history.replaceState(null, "", "#v-" + view);
    window.scrollTo(0, 0);
  }
  $$("#bottomnav button").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));

  // ---- bottom sheet ----
  const sheet = $("#sheet");
  let sheetPushed = false;
  function openSheet(html){
    $("#sheet-body").innerHTML = `<button class="sheet-close" data-close aria-label="閉じる">&times;</button>` + html;
    sheet.hidden = false; document.body.style.overflow = "hidden";
    $(".sheet-panel").scrollTop = 0;
    if (!sheetPushed) { try { history.pushState({sheet:1}, ""); sheetPushed = true; } catch(e){} }
  }
  function closeSheet(fromPop){
    sheet.hidden = true; document.body.style.overflow = "";
    if (sheetPushed && !fromPop) { sheetPushed = false; try { history.back(); } catch(e){} }
    else sheetPushed = false;
  }
  window.addEventListener("popstate", () => { if (!sheet.hidden) closeSheet(true); });
  sheet.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeSheet(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });
  function spotSheet(id){
    const s = SPOT[id]; if (!s) return;
    const c = CATS[s.cat];
    const tags = [];
    if (s.hours) tags.push(`<span class="tag">${esc(s.hours)}</span>`);
    if (s.price) tags.push(`<span class="tag gold">${esc(s.price)}</span>`);
    if (s.walk && s.walk!=="—") tags.push(`<span class="tag">宿から ${esc(s.walk)}</span>`);
    const cl = closedLabel(s); if (cl) tags.push(`<span class="tag ${closedToday(s)?"warn":""}">${esc(cl)}${closedToday(s)?"（今日は休み）":""}</span>`);
    openSheet(`
      ${img(s.photo,"big")}
      <div class="small" style="color:${c.color};font-weight:700">${esc(c.label)}　<span class="muted">${esc(s.area||"")}</span></div>
      <h2>${esc(s.name)}</h2>
      <div>${tags.join("")}</div>
      <p class="desc">${esc(s.desc)}</p>
      ${s.tip ? `<div class="tipbox">${esc(s.tip)}</div>` : ""}
      <div class="btnrow">
        <a class="btn" href="${mapsUrl(s.q||s.name)}" target="_blank" rel="noopener">Googleマップで開く</a>
        <a class="btn alt" href="${navUrl(s.q||s.name, "walking")}" target="_blank" rel="noopener">徒歩ナビ</a>
        ${s.lat ? `<button class="btn alt" data-mapto="${s.id}">地図で見る</button>` : ""}
      </div>`);
    $$("[data-mapto]", sheet).forEach(b => b.addEventListener("click", () => { closeSheet(); setTimeout(() => { show("map"); focusSpot(b.dataset.mapto); }, 60); }));
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-spot]"); if (t) { e.preventDefault(); spotSheet(t.dataset.spot); }
  });

  function spotChip(id){
    const s = SPOT[id]; if (!s) return "";
    return `<button class="spotchip" data-spot="${id}" style="--c:${CATS[s.cat].color}">${esc(s.name)}</button>`;
  }
  function spotCard(s){
    const c = CATS[s.cat];
    const ph = s.photo ? `<img class="ph" src="img/${s.photo}" alt="" loading="lazy">` : `<div class="ph noimg" style="background:${c.color}">${esc(s.name.slice(0,1))}</div>`;
    const meta = [s.hours, s.price, s.walk && s.walk!=="—" ? "宿から"+s.walk : ""].filter(Boolean).join("・");
    const cl = closedLabel(s);
    return `<button class="spot" data-spot="${s.id}">${ph}<div class="in"><h3>${esc(s.name)}</h3><div class="meta">${esc(meta)}</div>${cl?`<span class="tag ${closedToday(s)?"warn":""}">${esc(cl)}${closedToday(s)?"・今日休み":""}</span>`:""}<div class="desc">${esc(s.desc)}</div></div></button>`;
  }

  // ---- 友人推薦・居酒屋候補・雨のDAY2（共通部品） ----
  function izakayaCard(){
    const Z = window.IZAKAYA; if (!Z) return "";
    const rows = Z.rows.map(r => {
      const s = SPOT[r.id]; if (!s) return "";
      const cl = closedLabel(s);
      return `<tr><td><button class="linklike" data-spot="${r.id}">${esc(s.name)}</button><div class="muted small">${esc(r.type)}${s.walk&&s.walk!=="—"?"・"+esc(s.walk):""}</div></td>
        <td>${esc(r.why)}<div class="muted small">${esc(r.note)}${cl?`　<span class="tag ${closedToday(s)?"warn":""}">${esc(cl)}${closedToday(s)?"・今日休み":""}</span>`:""}</div></td></tr>`;
    }).join("");
    return `<div class="card"><h2>友愛市場以外の候補（同じ夜に置き換えられる店）</h2>
      <div class="small">${esc(Z.lead)}</div>
      <table style="margin-top:8px"><tr><th style="width:42%">店</th><th>選ぶ理由</th></tr>${rows}</table>
      <div class="pickbox"><b>おすすめの型</b>　${esc(Z.pick)}</div>
      <div class="muted small" style="margin-top:6px">${esc(Z.warn)}</div></div>`;
  }
  function judgeCard(){
    const R = window.RAINDAY2; if (!R) return "";
    return `<div class="card altplan"><h2>四草に行く／やめるの決め方</h2>
      <ul class="plain small">${R.judge.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
  }
  function swapCard(){
    const R = window.RAINDAY2; if (!R) return "";
    return `<div class="card"><h2>四草をやめたぶんの置き換え</h2>
      <table><tr><th style="width:38%">捨てるもの</th><th>置き換え</th></tr>${R.swap.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.to)}</td></tr>`).join("")}</table>
      <div class="muted small" style="margin-top:6px">${esc(R.cost)}</div></div>`;
  }

  // ---- HOME ----
  function renderHome(){
    const days = ["2026-08-29","2026-08-30","2026-08-31"];
    let cd = "";
    const today = new Date(Date.UTC(TN.y, TN.m-1, TN.d));
    const start = new Date(Date.UTC(2026,7,29)), end = new Date(Date.UTC(2026,7,31));
    const diff = Math.round((start - today)/86400000);
    if (diff > 0) cd = `出発まであと${diff}日`; else if (today <= end) cd = `旅行中 DAY${Math.round((today-start)/86400000)+1}`; else cd = "また行こう";
    const statusRows = TRIP.status.map(s => `<b>${esc(s.k)}</b><span class="${s.ok?"ok":"ng"}">${esc(s.v)}</span>`).join("");
    const todayKey = tripDay || "sat";
    $("#home").innerHTML = `
      <div class="hero">
        <img src="img/sicao.jpg" alt="四草綠色隧道">
        <div class="countdown">${cd}</div>
        <div class="hero-text"><h1>${esc(TRIP.title)}</h1><div class="hero-sub">${esc(TRIP.dates)}　4人旅　拠点＝旧市街・保安路</div></div>
      </div>
      <div class="btnrow" style="margin:0 0 12px">
        <button class="btn red" data-go="plan" data-day="${todayKey}">今日のしおりを開く</button>
        <a class="btn" href="${navUrl(TRIP.hotel.addr,"walking")}" target="_blank" rel="noopener">ホテルへ帰る（ナビ）</a>
        <button class="btn alt" data-go="map">地図</button>
      </div>
      ${(()=>{ if(!tripDay) return ""; const d = DAYS.find(x=>x.key===tripDay); const its = planItems(d); const ni = nowIndex(tripDay, its); const next = its.slice(Math.max(0,ni), Math.max(0,ni)+3); if(!next.length) return ""; return `<div class="card"><h2>いまと、この後</h2><div class="next-list">${next.map((it,i)=>`<div class="next-item"><b>${esc(it.t)}</b><div>${esc(it.title)}${i===0&&ni>=0?'<span class="now-badge">いま</span>':""}<div class="muted small">${esc(it.body).slice(0,60)}</div></div></div>`).join("")}</div></div>`; })()}
      <div class="card" id="wxcard"><h2>天気（台南・自動更新）</h2><div class="muted small">読み込み中…</div></div>
      <div class="card"><h2>フライトと宿</h2>
        ${TRIP.flights.map(f=>`<h3>${esc(f.day)}</h3><div>${esc(f.no)}　<b>${esc(f.route)}</b></div><div class="muted small">${esc(f.memo)}</div>`).join("")}
        <h3>宿</h3><div><b>${esc(TRIP.hotel.name)}</b></div><div class="small">${esc(TRIP.hotel.addr)}　<a href="tel:+886${TRIP.hotel.tel.replace(/^0/,"").replace(/-/g,"")}">${esc(TRIP.hotel.tel)}</a></div><div class="muted small">${esc(TRIP.hotel.note)}</div>
        <div class="btnrow"><a class="btn" href="${mapsUrl(TRIP.hotel.addr)}" target="_blank" rel="noopener">宿をGoogleマップで</a></div>
      </div>
      <div class="card"><h2>予約・手続きの状態</h2><div class="kv">${statusRows}</div></div>
      <div class="card"><h2>この旅の方針（3行）</h2><ul class="plain">${TRIP.policy.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></div>
      <div class="card"><h2>3日間の流れ</h2>
        ${DAYS.map(d=>`<h3>${esc(d.label)}　${esc(d.title)}</h3><div class="wxline ${d.weather.mark}">${esc(d.weather.text)}</div>`).join("")}
        <div class="btnrow"><button class="btn alt" data-go="plan">しおりへ</button></div>
      </div>
      <div class="card"><h2>今日を逃すと終わり</h2><table>${LASTCHANCE.map(r=>`<tr><th style="width:26%">${esc(r.day)}</th><td>${esc(r.items)}</td></tr>`).join("")}</table></div>
      <div class="credits">${esc(CREDITS)}${window.PHOTO_CREDITS?"<br>"+esc(window.PHOTO_CREDITS):""}</div>`;
    $$("[data-go]").forEach(b => b.addEventListener("click", () => { show(b.dataset.go); if (b.dataset.day) setDay(b.dataset.day); }));
    loadWeather();
  }

  // ---- weather (Open-Meteo) ----
  async function loadWeather(){
    const el = $("#wxcard");
    try {
      const u = "https://api.open-meteo.com/v1/forecast?latitude=22.9908&longitude=120.2&hourly=precipitation_probability,precipitation,weather_code,temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FTaipei&forecast_days=7";
      const r = await fetch(u); const j = await r.json();
      const want = ["2026-08-29","2026-08-30","2026-08-31"];
      const labels = {"2026-08-29":"8/29 土","2026-08-30":"8/30 日","2026-08-31":"8/31 月"};
      // 旅行日が予報範囲外なら直近3日
      let days = want.filter(d => j.daily.time.includes(d));
      if (!days.length) days = j.daily.time.slice(0,3);
      const blocks = [[6,9],[9,12],[12,15],[15,18],[18,21],[21,24]];
      const html = days.map(d => {
        const i = j.daily.time.indexOf(d);
        const pmax = j.daily.precipitation_probability_max[i], psum = j.daily.precipitation_sum[i];
        const mark = psum >= 25 ? "bad" : psum >= 8 ? "mid" : "good";
        const hrs = blocks.map(([a,b]) => {
          let p = 0, mm = 0;
          for (let h=a; h<b; h++) { const k = j.hourly.time.indexOf(`${d}T${String(h).padStart(2,"0")}:00`); if (k>=0){ p = Math.max(p, j.hourly.precipitation_probability[k]||0); mm += j.hourly.precipitation[k]||0; } }
          const cls = mm >= 3 ? "r3" : mm >= 1 ? "r2" : p >= 60 ? "r1" : "";
          return `<div class="wx-h ${cls}"><div>${a}-${b}</div><div class="p">${p}%</div><div>${mm.toFixed(1)}</div></div>`;
        }).join("");
        return `<div class="wx-day ${mark}"><b>${esc(labels[d]||d.slice(5))}</b><div class="t">${Math.round(j.daily.temperature_2m_min[i])}〜${Math.round(j.daily.temperature_2m_max[i])}℃　雨 ${psum.toFixed(0)}mm／最大${pmax}%</div><div class="wx-hours">${hrs}</div></div>`;
      }).join("");
      el.innerHTML = `<h2>天気（台南・自動更新）</h2><div class="wx-days">${html}</div>
        <div class="wx-note">時間帯ごとに 降水確率％／雨量mm。青が濃いほど降る。出典 Open-Meteo（開くたびに更新）。公式は <a href="https://www.cwa.gov.tw/V8/C/W/County/County.html?CID=67" target="_blank" rel="noopener">中央氣象署 台南市</a>・雨雲は <a href="https://www.windy.com/?rain,22.99,120.20,10" target="_blank" rel="noopener">Windy</a></div>`;
    } catch(e) {
      el.innerHTML = `<h2>天気</h2><div class="wx-days">${DAYS.map(d=>`<div class="wx-day ${d.weather.mark}"><b>${esc(d.label)}</b><div class="t">${esc(d.weather.text)}</div></div>`).join("")}</div><div class="wx-note">（オフライン表示＝8/28時点の見立て）公式は <a href="https://www.cwa.gov.tw/" target="_blank" rel="noopener">中央氣象署</a></div>`;
    }
  }

  // ---- PLAN ----
  const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };
  let curDay = tripDay || store.get("day") || "sat", rainMode = store.get("rain") === "1";
  const curVar = {};
  function varOf(k){ return curVar[k] || store.get("var_" + k) || "main"; }
  function setVar(k, v){ curVar[k] = v; store.set("var_" + k, v); renderPlan(); window.scrollTo({ top:0, behavior:"smooth" }); }
  function useAlt(d){ return !!(d && d.alt) && varOf(d.key) === "alt"; }
  // 選ばれている筋書きのタイムラインを合成する（分岐点までは共通、そこから差し替え）
  function planItems(d){ return useAlt(d) ? d.items.slice(0, d.alt.splitAt).concat(d.alt.items) : d.items; }
  function planHead(d){
    const a = useAlt(d) ? d.alt : null;
    return { title: (a && a.title) || d.title, lead: (a && a.lead) || d.lead, branches: (a && a.branches) || d.branches };
  }
  function setDay(k){ curDay = k; store.set("day", k); renderPlan(); }
  function minutesOf(t){ const m = /^(\d{1,2}):(\d{2})/.exec(t); return m ? (+m[1])*60 + (+m[2]) : null; }
  function nowIndex(dayKey, items){
    if (dayKey !== tripDay) return -1;
    const now = TN.h*60 + TN.mi; let idx = -1;
    items.forEach((it,i) => { const m = minutesOf(it.t); if (m !== null && m <= now) idx = i; });
    return idx;
  }
  function renderPlan(){
    const d = DAYS.find(x => x.key === curDay);
    const alt = d.alt, on = useAlt(d), head = planHead(d);
    const its = planItems(d);
    const ni = nowIndex(curDay, its);
    const splitAt = alt ? alt.splitAt : -1;
    const items = its.map((it,i) => `
      <div class="tl-item ${i===ni?"now":""} ${ni>=0&&i<ni?"past":""} ${on&&i>=splitAt?"swapped":""}" id="tl-${i}"><div class="time">${esc(it.t)}</div>
        <div class="tl-card ${it.rain?"has-rain":""}">${it.photo?img(it.photo):""}<div class="in">
          <h3>${esc(it.title)}${i===ni?'<span class="now-badge">いま</span>':""}</h3><p>${esc(it.body)}</p>
          ${it.spots && it.spots.length ? `<div class="spotchips">${it.spots.map(spotChip).join("")}</div>` : ""}
          ${it.rain ? `<div class="rain-box"><b>雨が強いなら</b>　${esc(it.rain)}</div>` : ""}
        </div></div></div>`).join("");
    const vartabs = alt ? `<div class="vartabs" role="tablist">
        <button class="${on?"":"on"}" data-var="main"><b>${esc(d.mainLabel.label)}</b><small>${esc(d.mainLabel.sub)}</small></button>
        <button class="${on?"on":""}" data-var="alt"><b>${esc(alt.label)}</b><small>${esc(alt.sub)}</small></button>
      </div>` : "";
    $("#plan").innerHTML = `
      <div class="plan-sticky">
        <div class="daytabs">${DAYS.map(x=>`<button class="${x.key===curDay?"on":""}" data-day="${x.key}">${esc(x.label.split(" ")[0])}<small>${esc(x.label.split(" ")[1])}曜</small></button>`).join("")}</div>
        ${vartabs}
      </div>
      <div class="day-head"><h2>${esc(head.title)}</h2><div class="muted small">${esc(head.lead)}</div><div class="wxline ${d.weather.mark}">${esc(d.weather.text)}</div>${ni>=0?`<div class="btnrow"><button class="btn red" id="gonow">いまの予定へ</button></div>`:""}</div>
      ${on && alt.showJudge ? judgeCard() : ""}
      <div class="tl ${rainMode?"rainmode":""}">${items}</div>
      ${on && alt.showIzakaya ? izakayaCard() : ""}
      ${head.branches ? `<div class="card"><h2>メモ・分岐</h2><ul class="plain">${head.branches.map(b=>`<li>${esc(b)}</li>`).join("")}</ul></div>` : ""}
      <div class="rain-toggle"><div><b>雨モード</b><div class="muted small">雨の差し替えがある行だけを強調</div></div><button class="switch ${rainMode?"on":""}" id="rainsw" aria-label="雨モード"></button></div>
      ${on && alt.showJudge ? swapCard() : ""}
      <div class="card"><h2>雨天の差し替え表</h2><table><tr><th>予定</th><th>差し替え</th></tr>${RAIN.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.to)}${r.ids.length?`<div class="spotchips">${r.ids.map(spotChip).join("")}</div>`:""}</td></tr>`).join("")}</table></div>`;
    $$("#plan .daytabs button").forEach(b => b.addEventListener("click", () => setDay(b.dataset.day)));
    $$("#plan .vartabs button").forEach(b => b.addEventListener("click", () => setVar(curDay, b.dataset.var)));
    $("#rainsw").addEventListener("click", () => { rainMode = !rainMode; store.set("rain", rainMode?"1":"0"); renderPlan(); });
    const gn = $("#gonow"); if (gn) gn.addEventListener("click", () => { const el = $("#tl-"+ni); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior:"smooth" }); });
  }

  // ---- MAP ----
  let MAP = null, LAYER = null, MARK = {}, activeCats = new Set(Object.keys(CATS));
  function initMap(){
    if (mapInited || !window.L) return; mapInited = true;
    MAP = L.map("leaflet-map", { zoomControl:false }).setView([22.9935, 120.199], 15);
    L.control.zoom({ position:"topright" }).addTo(MAP);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(MAP);
    LAYER = L.layerGroup().addTo(MAP);
    drawMarkers();
    // toolbar
    $("#map-toolbar").innerHTML = `<button class="chip on" data-cat="all">すべて</button>` + Object.entries(CATS).map(([k,c])=>`<button class="chip on" data-cat="${k}"><span class="dot" style="background:${c.color}"></span>${esc(c.label)}</button>`).join("");
    $$("#map-toolbar .chip").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.cat;
      if (k === "all") { const all = activeCats.size === Object.keys(CATS).length; activeCats = new Set(all ? [] : Object.keys(CATS)); }
      else { activeCats.has(k) ? activeCats.delete(k) : activeCats.add(k); }
      $$("#map-toolbar .chip").forEach(c => c.classList.toggle("on", c.dataset.cat==="all" ? activeCats.size===Object.keys(CATS).length : activeCats.has(c.dataset.cat)));
      drawMarkers();
    }));
    $("#map-legend").innerHTML = `ピンをタップ→店の説明とGoogleマップ。旧市街は徒歩、安平・四草・夜市は車。`;
    const loc = document.createElement("button"); loc.className = "locate-btn"; loc.innerHTML = "&#9678;"; loc.title = "現在地";
    loc.addEventListener("click", () => MAP.locate({ setView:true, maxZoom:16 }));
    $("#map").appendChild(loc);
    let me = null;
    MAP.on("locationfound", e => { if (me) me.remove(); me = L.circleMarker(e.latlng, { radius:8, color:"#fff", weight:2, fillColor:"#2b6cb0", fillOpacity:1 }).addTo(MAP).bindPopup("現在地"); });
    MAP.on("locationerror", () => alert("現在地が取れませんでした（位置情報の許可を確認）"));
  }
  function drawMarkers(){
    LAYER.clearLayers(); MARK = {};
    SPOTS.forEach(s => {
      if (!s.lat || !activeCats.has(s.cat)) return;
      const c = CATS[s.cat].color;
      const isHotel = s.id === "hotel";
      const m = L.circleMarker([s.lat, s.lng], { radius: isHotel ? 11 : 7, color:"#fff", weight: isHotel ? 3 : 1.5, fillColor: isHotel ? "#c0392b" : c, fillOpacity: .95 });
      m.bindPopup(`<b>${esc(s.name)}</b><br><span style="color:${c};font-size:11px">${esc(CATS[s.cat].label)}</span>${s.walk&&s.walk!=="—"?`<span style="font-size:11px;color:#666">　宿から${esc(s.walk)}</span>`:""}<br><span style="font-size:12px">${esc((s.desc||"").slice(0,70))}…</span><div class="pop-actions"><a href="#" data-spot="${s.id}" class="alt">詳しく</a><a href="${mapsUrl(s.q||s.name)}" target="_blank" rel="noopener">Googleマップ</a></div>`);
      if (isHotel) m.bindTooltip("宿", { permanent:true, direction:"top", offset:[0,-8], className:"hotel-tip" });
      m.addTo(LAYER); MARK[s.id] = m;
    });
  }
  function focusSpot(id){ const s = SPOT[id]; if (!s || !s.lat) return; if (!activeCats.has(s.cat)) { activeCats.add(s.cat); drawMarkers(); } MAP.setView([s.lat, s.lng], 17); MARK[id] && MARK[id].openPopup(); }

  // ---- EAT ----
  const EAT_CATS = ["beef","bfast","street","noodle","dinner","night","sweet","bar"];
  let eatCat = "all", eatQ = "";
  function renderEat(){
    const list = SPOTS.filter(s => EAT_CATS.includes(s.cat) && (eatCat==="all" || s.cat===eatCat) && (!eatQ || (s.name+s.desc+(s.area||"")).includes(eatQ)));
    $("#eat").innerHTML = `
      <div class="section-title">食べる図鑑　<span class="muted small">${list.length}件</span></div>
      <div class="sticky-tools"><input class="search" id="eatq" placeholder="店名・料理で検索（例：牛肉湯、豆花、保安路）" value="${esc(eatQ)}">
      <div class="chips"><button class="chip ${eatCat==="all"?"on":""}" data-c="all">すべて</button>${EAT_CATS.map(k=>`<button class="chip ${eatCat===k?"on":""}" data-c="${k}"><span class="dot" style="background:${CATS[k].color}"></span>${esc(CATS[k].label)}</button>`).join("")}</div></div>
      ${eatCat==="beef"||eatCat==="all" ? `<div class="card"><h2>牛肉湯の作法</h2><div class="small">その日の朝に屠った温体牛の薄切りに熱い牛骨スープを注いで半生でいただく台南人のソウルフード。①スープを一口→②肉を沈めて数秒→③薑絲と豆瓣醬ダレで。ご飯（肉燥飯）を頼むのが台南流。1杯NT$120前後＝滞在中に2〜3杯、店を変えて飲み比べるのが正しい遊び方。<br><span class="muted">古い記事に出る「康樂街牛肉湯」は2024年に廃業。</span></div></div>` : ""}
      <div class="spot-list">${list.map(spotCard).join("")}</div>
      <div class="card" style="margin-top:12px"><h2>台南メシの作法</h2><ul class="plain small">
        <li>小吃は1杯NT$40〜150。1店1〜2品を4人でシェアして数を稼ぐ。</li>
        <li>人気店は「売り切れ次第終了」「不定休（FBで当日告知）」が普通。行きたい店ほど早い時間帯に。</li>
        <li>相席・セルフ・先払い/後払い混在。メニュー紙に自分で記入する方式が多く、指差し＋枚数で通じる。</li>
        <li>味付けは全体に甘め（砂糖はかつて台南の富の象徴）。「台南＝甘い」を知って食べると解像度が上がる。</li>
        <li>「内用（店内で）／外帯（持ち帰り）」だけ覚えておくと注文が速い。</li></ul></div>`;
    $$("#eat .chip").forEach(b => b.addEventListener("click", () => { eatCat = b.dataset.c; renderEat(); }));
    const q = $("#eatq"); q.addEventListener("input", () => { eatQ = q.value.trim(); renderEatList(); });
  }
  function renderEatList(){
    const list = SPOTS.filter(s => EAT_CATS.includes(s.cat) && (eatCat==="all" || s.cat===eatCat) && (!eatQ || (s.name+s.desc+(s.area||"")).includes(eatQ)));
    $("#eat .spot-list").innerHTML = list.map(spotCard).join("");
    $("#eat .section-title .muted").textContent = list.length + "件";
  }

  // ---- SHOP & SIGHT ----
  const SHOP_TABS = [
    { k:"shop",  label:"買い物" },
    { k:"sight", label:"見る・歩く" },
    { k:"night", label:"夜さんぽ" },
    { k:"exp",   label:"体験" },
    { k:"trip",  label:"郊外" }
  ];
  let shopTab = store.get("shoptab") || "shop";
  function shopSection(k){
    const list = c => SPOTS.filter(s => s.cat === c);
    if (k === "shop") return `
      <div class="card"><h2>買い物は土日で完結</h2><div class="small">最終日8/31（月）はホテル9:45発。月曜休の店が多い上に、無休の林百貨すら11時開店で間に合わない。「最終日に買えばいいや」は台南では通用しない。日曜14:30〜17:30が買い物のゴールデンタイム＝2組に分かれて器係・雑貨係・菓子係を決める。</div>
        <div class="grid2" style="margin-top:8px">
          <div><h3>ルートA 雑貨・百貨</h3><div class="small">錦源興→林百貨→帆布3店→振發茶行</div></div>
          <div><h3>ルートB 器・古道具</h3><div class="small">餐桌上的鹿早→鳥飛古物店→北山雜貨</div></div>
        </div></div>
      <div class="spot-list">${list("shop").map(spotCard).join("")}</div>`;
    if (k === "sight") return `
      <div class="card"><h2>台湾400年の起点</h2><div class="small">1624年オランダが安平に城を築き、1661年に鄭成功が奪い、清・日本と支配者が塗り重なった「地層」がそのまま歩ける街。建物より物語で回ると数倍面白い。廟はすべて現役の信仰の場＝作法は係の人に聞くと丁寧に教えてくれる。</div></div>
      <div class="spot-list">${list("sight").map(spotCard).join("")}</div>`;
    if (k === "night") return `
      <div class="card"><h2>夜の提灯さんぽ（徒歩のみ・約3時間）</h2>
        <div class="small muted" style="margin-bottom:6px">日没18:25。普済殿の「提灯トンネル」は旧正月限定＝8月は無い。神農街の赤提灯は通年点灯＝そちらが本命。</div>
        <table>${NIGHTROUTE.map(r=>`<tr><th style="width:56px">${esc(r.t)}</th><td>${esc(r.p)}</td></tr>`).join("")}</table>
        <h3 style="margin-top:10px">ベスト撮影時間</h3>
        <table><tr><th>場所</th><th>時間帯</th></tr>
          <tr><td>林百貨屋上（鳥居×夕焼け）</td><td>17:30〜18:30</td></tr><tr><td>神農街（提灯×青い空）</td><td>18:15〜19:00／人少なめは21時以降</td></tr><tr><td>祀典武廟の朱壁</td><td>18:30〜21:00（20時以降ほぼ無人）</td></tr><tr><td>河樂廣場の水鏡</td><td>18:00〜21:00</td></tr><tr><td>蝸牛巷（路地の斜光）</td><td>15:00〜18:00</td></tr></table></div>
      <div class="spot-list">${["shennong","wumiao","datianhou","hele","haian","hayashi","duiyue"].map(id=>SPOT[id]).filter(Boolean).map(spotCard).join("")}</div>`;
    if (k === "exp") return `
      <div class="card"><h2>体験（1〜2個が適量）</h2><div class="small">日曜14:00〜16:00の酷暑タイムが第一候補。茶芸・線香・藍染・又又美はすべて屋内＝雨の日の受け皿にもなる。残りは「次回の台南」に取っておく。</div></div>
      <div class="spot-list">${list("exp").map(spotCard).join("")}</div>`;
    if (k === "trip") return `
      <div class="card"><h2>郊外・日帰り（友人推薦・今回は候補）</h2><div class="small">${esc((window.FRIEND&&window.FRIEND.farVerdict)||"")}</div>
        <details class="acc" style="margin-top:6px"><summary>それでも行くなら（丸1日コースの形）</summary><div class="body"><ul class="plain small">${((window.FRIEND&&window.FRIEND.farIf)||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><div class="muted small">${esc((window.FRIEND&&window.FRIEND.next)||"")}</div></div></details></div>
      <div class="spot-list">${list("trip").map(spotCard).join("")}</div>`;
    return "";
  }
  function shopCount(k){
    if (k === "night") return 7;
    return SPOTS.filter(s => s.cat === k).length;
  }
  function renderShop(){
    $("#shop").innerHTML = `
      <div class="sticky-tools"><div class="chips wrap">${SHOP_TABS.map(t=>`<button class="chip ${shopTab===t.k?"on":""}" data-t="${t.k}">${esc(t.label)}<span class="cnt">${shopCount(t.k)}</span></button>`).join("")}</div></div>
      <div id="shop-body">${shopSection(shopTab)}</div>`;
    $$("#shop .chip").forEach(b => b.addEventListener("click", () => {
      shopTab = b.dataset.t; store.set("shoptab", shopTab);
      $("#shop-body").innerHTML = shopSection(shopTab);
      $$("#shop .chip").forEach(c => c.classList.toggle("on", c.dataset.t === shopTab));
      window.scrollTo({ top:0, behavior:"smooth" });
    }));
  }

  // ---- TIPS ----
  function renderTips(){
    const sec = (title, arr) => `<details class="acc"><summary>${esc(title)}</summary><div class="body"><ul class="plain">${arr.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></details>`;
    $("#tips").innerHTML = `
      <div class="section-title">虎の巻</div>
      <div class="card">
        ${sec("お金", TIPS.money)}
        ${sec("通信・eSIM", TIPS.comm)}
        ${sec("移動・タクシー", TIPS.move)}
        ${sec("雨の日の判断ルール", TIPS.rain)}
        ${sec("持ち物（雨版）", TIPS.pack)}
        ${sec("入国・安全", TIPS.entry)}
        <details class="acc"><summary>注文のことば</summary><div class="body"><table><tr><th>中国語</th><th>読み</th><th>意味</th></tr>${TIPS.words.map(w=>`<tr><td><b>${esc(w.zh)}</b></td><td>${esc(w.yomi)}</td><td>${esc(w.ja)}</td></tr>`).join("")}</table><div class="muted small" style="margin-top:6px">小吃店は中国語のみが基本だが、指差し注文＋Google翻訳カメラで全員クリアできる。林百貨や観光地では日本語がときどき、若い店・バーは英語OK。</div></div></details>
        <details class="acc" open><summary>連絡先・住所</summary><div class="body"><div class="kv">${TIPS.contacts.map(c=>`<b>${esc(c.k)}</b><span>${esc(c.v)}</span>`).join("")}</div></div></details>
      </div>
      <div class="card"><h2>曜日別 営業早見表（この旅程専用）</h2><table>
        <tr><th>日</th><th>この日だけ／この日が最適</th><th>休み・不可</th></tr>
        <tr><td><b>8/29 土</b></td><td>武聖夜市（土曜のみ）／花園夜市／連得堂煎餅は土曜午前が確実／TCRC（日曜休の情報→土曜夜）／全店ほぼ営業</td><td>行列は週末最大級（阿明豬心は開店前並び推奨）</td></tr>
        <tr><td><b>8/30 日</b></td><td>花園夜市／包成羊肉・阿江炒鱔魚・八寶彬・裕成・府城牛肉湯・双生・錦源興・十八卯——月曜休の面々はこの日までに／安平の店も日曜がフル稼働</td><td>雙全紅茶（日曜休）／醇涎坊は14時まで</td></tr>
        <tr><td><b>8/31 月</b></td><td>朝のみ：阿憨鹹粥・矮仔成（8:30〜）・阿村牛肉湯・無名羊肉湯・阿公阿婆蛋餅・富盛號・水仙宮市場</td><td>阿霞・醇涎坊・包成・阿江・八寶彬・裕成・府城牛肉湯・双生・錦源興・十八卯・鴨母寮市場の多く／林百貨は11時開店</td></tr>
      </table></div>
      <div class="card"><h2>雨天の差し替え表</h2><table><tr><th>予定</th><th>差し替え</th></tr>${RAIN.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.to)}</td></tr>`).join("")}</table></div>
      <div class="card"><h2>公式リンク</h2><div class="btnrow">
        <a class="btn alt" href="https://www.cwa.gov.tw/V8/C/W/County/County.html?CID=67" target="_blank" rel="noopener">中央氣象署 台南</a>
        <a class="btn alt" href="https://www.windy.com/?rain,22.99,120.20,10" target="_blank" rel="noopener">Windy 雨雲</a>
        <a class="btn alt" href="https://www.jetstar.com/jp/ja/travel-alerts" target="_blank" rel="noopener">ジェットスター運航情報</a>
        <a class="btn alt" href="https://www.twtainan.net/ja" target="_blank" rel="noopener">台南旅遊網（日本語）</a>
        <a class="btn alt" href="https://twac.immigration.gov.tw/" target="_blank" rel="noopener">TWAC 入国カード</a>
      </div></div>
      <div class="credits">${esc(CREDITS)}${window.PHOTO_CREDITS?"<br>"+esc(window.PHOTO_CREDITS):""}</div>`;
  }

  // ---- boot ----
  renderHome(); renderPlan(); renderEat(); renderShop(); renderTips();
  const h = (location.hash||"").replace(/^#(v-)?/,""); show(["home","plan","map","eat","shop","tips"].includes(h) ? h : "home");
  if (QS.get("spot") && SPOT[QS.get("spot")]) spotSheet(QS.get("spot"));
  // back to top
  const tt = document.createElement("button"); tt.className = "totop"; tt.innerHTML = "&uarr;"; tt.title = "上へ"; document.body.appendChild(tt);
  tt.addEventListener("click", () => window.scrollTo({ top:0, behavior:"smooth" }));
  window.addEventListener("scroll", () => tt.classList.toggle("show", window.scrollY > 600), { passive:true });
  // service worker (https のときだけ)
  if ("serviceWorker" in navigator && location.protocol === "https:") { navigator.serviceWorker.register("sw.js").catch(()=>{}); }
})();
