// كل ما تعمل تعديل جوهري على index.html، غيّر الرقم هون (مثلاً v4, v5...)
// عشان يتحدث الكاش عند المستخدمين تلقائياً.
var CACHE_NAME = 'abu-basel-cache-v3';

var APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      // نحفظ كل ملف لحاله بدل addAll، عشان لو ملف واحد فشل (مثلاً
      // مش موجود) ما يوقف حفظ باقي الملفات كلها.
      return Promise.all(APP_SHELL.map(function(url){
        return cache.add(url).catch(function(err){
          console.error('sw: تعذر حفظ', url, err);
        });
      }));
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;

  // صفحة التطبيق نفسها: جرّب الإنترنت أول (لآخر تحديث)، ولو ما في نت
  // رجّع النسخة المحفوظة محلياً بدل ما يفشل الفتح كلياً.
  if(event.request.mode === 'navigate'){
    event.respondWith(
      fetch(event.request).then(function(response){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){
        return caches.match('./index.html');
      })
    );
    return;
  }

  // باقي الملفات (خطوط، سكربتات فايربيز، الأيقونات...):
  // رجّع النسخة المحفوظة فوراً إذا موجودة (أسرع + بتشتغل أوفلاين)،
  // وبنفس الوقت حدّثها بالخلفية من الإنترنت لمرة الجاية.
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var fetchPromise = fetch(event.request).then(function(response){
        if(response && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){ return cached; });
      return cached || fetchPromise;
    })
  );
});
