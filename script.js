// ===== CONFIG =====
const REMOVEBG_API_KEY = window.REMOVEBG_API_KEY || '__REMOVEBG_API_KEY__';

// ===== STATE =====
const tabs = document.querySelectorAll('.tab:not(.subtab)');
const subtabs = document.querySelectorAll('.subtab');
const panels = document.querySelectorAll('.tab-panel');
const subpanels = document.querySelectorAll('.subtab-panel');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const galleryGrid = document.getElementById('galleryGrid');
const video = document.getElementById('video');
const recordPreview = document.getElementById('recordPreview');

let original = null;
let current = null;
let recorder, chunks = [], stream;

// ===== TABS =====
tabs.forEach(t => t.onclick = () => {
    tabs.forEach(b => b.classList.remove('active'));
    panels.forEach(p => p.style.display = 'none');

    t.classList.add('active');
    const panel = document.getElementById(t.dataset.tab);
    panel.style.display = 'block';

    const editorArea = document.getElementById('editorArea');
    editorArea.style.display = (t.dataset.tab === 'camera') ? 'none' : 'block';

    if (current && t.dataset.tab !== 'camera') draw(current);
});

subtabs.forEach(t => t.onclick = () => {
    subtabs.forEach(b => b.classList.remove('active'));
    subpanels.forEach(p => p.style.display = 'none');
    t.classList.add('active');
    document.getElementById(t.dataset.subtab).style.display = 'block';
});

// ===== CANVAS / GALLERY =====
function draw(img){
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
}

function loadImage(src){
    const img = new Image();
    img.onload = () => {
        original = img;
        current = new Image();
        current.src = img.src; // initial state
        widthInput.value = img.width;
        heightInput.value = img.height;
        draw(current);
    };
    img.src = src;
}

function addToGallery(src){
    const i = document.createElement('img');
    i.src = src;
    i.onclick = () => { 
        document.querySelectorAll('.gallery img').forEach(e=>e.classList.remove('active'));
        i.classList.add('active');
        loadImage(src);
    };
    document.querySelectorAll('.gallery img').forEach(e=>e.classList.remove('active'));
    i.classList.add('active');
    galleryGrid.appendChild(i);
    loadImage(src);
}

// ===== FILE UPLOAD =====
fileInput.onchange = e => [...e.target.files].forEach(f=>{
    const r = new FileReader();
    r.onload = ()=> addToGallery(r.result);
    r.readAsDataURL(f);
});

// ===== LIVE EFFECTS =====
function applyLive(){
    if(!original) return;
    canvas.width = +widthInput.value || original.width;
    canvas.height = +heightInput.value || original.height;
    ctx.drawImage(original, 0, 0, canvas.width, canvas.height);
    if(+fryInput.value) deepFry(+fryInput.value);
    // save the current canvas state
    current = new Image();
    current.src = canvas.toDataURL();
}

widthInput.oninput = heightInput.oninput = fryInput.oninput = applyLive;

function deepFry(amount){
    const d = ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<d.data.length;i+=4){
        d.data[i]*=1+amount/40;
        d.data[i+1]*=1+amount/80;
        d.data[i+2]*=1+amount/20;
    }
    ctx.putImageData(d,0,0);
}

// ===== REMOVE.BG =====
removeBgBtn.onclick = async () => {
    if(!current) return alert('No image loaded');
    const blob = await (await fetch(canvas.toDataURL())).blob();
    const fd = new FormData();
    fd.append('image_file', blob);
    fd.append('size','auto');
    const res = await fetch('https://api.remove.bg/v1.0/removebg',{
        method:'POST',
        headers:{'X-Api-Key':REMOVEBG_API_KEY},
        body: fd
    });
    if(!res.ok) return alert('remove.bg failed');
    const out = URL.createObjectURL(await res.blob());
    addToGallery(out);
    loadImage(out);
}

// ===== EXPORT =====
downloadBtn.onclick = () => {
    if(!current) return;
    applyLive(); // ensure latest effects are applied
    const a = document.createElement('a');
    const type = formatSelect.value;
    a.download = 'image.'+type.split('/')[1];
    a.href = canvas.toDataURL(type,+qualityInput.value);
    a.click();
}

// ===== CAMERA =====
startCam.onclick = async () => {
    stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    video.srcObject = stream;
    recordPreview.srcObject = stream;

    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e=>chunks.push(e.data);
    recorder.onstop = ()=>{ 
        addToGallery(URL.createObjectURL(new Blob(chunks,{type:'video/webm'})));
        chunks=[];
    }
}

snap.onclick = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video,0,0);
    const url = canvas.toDataURL('image/png');
    addToGallery(url);
    loadImage(url);
}

recordBtn.onclick = () => {
    if(!recorder) return;
    recorder.state==='recording'?recorder.stop():recorder.start();
}
