/* Local, free QR generation. The QR and text link always identify the same episode. */
(function () {
 'use strict';
 var dialog, selected, qrFile, returnFocus, generation=0;
 function $(id){return document.getElementById(id);}
 function urlFor(id){var u=new URL('https://igornasonkin.github.io/paws-talk/');u.searchParams.set('ep',String(id));u.searchParams.set('s','share');return u.href;}
 function note(text){$('episode-share-status').textContent=text;}
 function setup(){
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='episode-share';dialog.setAttribute('aria-labelledby','episode-share-heading');
  dialog.innerHTML='<button type="button" class="episode-share-close" aria-label="Close sharing">×</button><h2 id="episode-share-heading">Share this episode</h2><p id="episode-share-title"></p><img id="episode-share-qr" width="288" height="288" alt="Scan to open this episode"><p class="episode-share-hint">Scan to listen, or send the link below.</p><label for="episode-share-link">Episode link</label><textarea id="episode-share-link" readonly rows="3"></textarea><div class="episode-share-actions"><button type="button" class="sharebtn" id="episode-copy">Copy link</button><a class="sharebtn" id="episode-save-qr" download>Save QR + link image</a><button type="button" class="sharebtn" id="episode-native-share" hidden>Share link…</button></div><p id="episode-share-status" role="status" aria-live="polite"></p>';
  document.body.appendChild(dialog);
  dialog.querySelector('.episode-share-close').onclick=function(){dialog.close();};
  dialog.addEventListener('close',function(){generation++;if(returnFocus&&returnFocus.isConnected)returnFocus.focus();});
  dialog.addEventListener('click',function(e){if(e.target===dialog){var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  $('episode-share-link').onclick=function(){this.select();};
  $('episode-copy').onclick=function(){var input=$('episode-share-link');function fallback(){input.focus();input.select();note('Press and hold the selected link to copy it.');}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(input.value).then(function(){note('Link copied. Paste it into a message or post.');},fallback);else fallback();};
  $('episode-native-share').onclick=function(){
   if(!selected||!navigator.share)return;
   var data={title:selected.title,text:selected.title+" — Today's Walk, Let's Talk",url:urlFor(selected.id)};
   if(qrFile&&navigator.canShare&&navigator.canShare({files:[qrFile]}))data.files=[qrFile];
   navigator.share(data).catch(function(e){if(e.name!=='AbortError')note('Sharing is unavailable here. Copy the link or save the QR image instead.');});
  };
 }
 window.WTShare=function(episode){
  if(!episode||!episode.id)return;
  setup();selected=episode;qrFile=null;returnFocus=document.activeElement;
  var token=++generation,url=urlFor(episode.id),qr=qrcode(0,'M');qr.addData(url);qr.make();
  var gif=qr.createDataURL(8,32),image=$('episode-share-qr'),save=$('episode-save-qr');
  $('episode-share-title').textContent=episode.title;$('episode-share-link').value=url;note('');
  $('episode-native-share').hidden=!navigator.share;$('episode-native-share').textContent='Share link…';
  save.href=gif;save.download='WalkTalk-episode-'+episode.id+'-QR.gif';
  image.onload=function(){
   if(generation!==token)return;
   var canvas=document.createElement('canvas');canvas.width=900;canvas.height=1100;
   var ctx=canvas.getContext('2d');ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,900,1100);ctx.fillStyle='#5b0a3c';ctx.textAlign='center';ctx.font='24px sans-serif';ctx.fillText("Today's Walk, Let's Talk · TurtleRock Paws",450,48);
   ctx.font='36px Georgia';var words=episode.title.split(/\s+/),line='',y=105;
   words.forEach(function(word){var next=line?line+' '+word:word;if(ctx.measureText(next).width>800&&line){ctx.fillText(line,450,y);y+=44;line=word;}else line=next;});ctx.fillText(line,450,y);
   ctx.imageSmoothingEnabled=false;ctx.drawImage(image,150,250,600,600);
   ctx.fillStyle='#5b0a3c';ctx.font='28px sans-serif';ctx.fillText('Scan to listen, or open this episode link:',450,900);
   ctx.font='24px monospace';var chunks=url.match(/.{1,48}/g)||[];chunks.forEach(function(chunk,i){ctx.fillText(chunk,450,950+i*34);});
   var filename='WalkTalk-episode-'+episode.id+'-QR.png';save.href=canvas.toDataURL('image/png');save.download=filename;
   canvas.toBlob(function(blob){if(!blob||generation!==token)return;qrFile=new File([blob],filename,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[qrFile]}))$('episode-native-share').textContent='Share QR + link…';},'image/png');
  };
  image.src=gif;if(!dialog.open)dialog.showModal();
 };
})();
