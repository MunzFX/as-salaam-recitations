import {createFileRoute} from '@tanstack/react-router';
import surahs from '../lib/surah-seed.json';
export const Route=createFileRoute('/sitemap.xml')({
 server: {
  handlers: {
   GET: ({request}) => {
    const o=new URL(request.url).origin;
    const paths=['/','/surahs','/recitations','/about',...surahs.map(s=>'/surah/'+s.slug)];
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+o+p+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml'}});
   }
  }
 }
});