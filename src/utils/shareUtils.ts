import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export const isCapacitor = () => {
  return typeof (window as any).Capacitor !== 'undefined';
};

interface ShareData {
  title: string;
  text: string;
  url?: string;
  photo?: string;
}

export async function shareVisitDetails({ title, text, url, photo }: ShareData) {
  try {
    const whatsappText = `${text}${url ? '\n\nMap Link: ' + url : ''}`;
    
    if (isCapacitor()) {
      const shareOptions: any = {
        title,
        text: whatsappText,
      };

      // Capacitor needs a file path or URI for sharing files
      if (photo && photo.startsWith('data:')) {
        try {
          const fileName = `site_share_${Date.now()}.jpg`;
          const base64Data = photo.split(',')[1];
          
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
            // @ts-ignore - some capacitor versions use lowercase or string literal
            encoding: 'base64'
          });
          
          shareOptions.files = [savedFile.uri];
          // On Android, sometimes including both files and URL/text works better if text contains the URL
          // Some apps might not handle 'url' param well when files are present
        } catch (e) {
          console.warn('Capacitor: Failed to save photo for sharing:', e);
        }
      } else if (url) {
        shareOptions.url = url;
      }

      await Share.share(shareOptions);
      return;
    }

    if (navigator.share) {
      const shareParams: any = {
        title,
        text: whatsappText,
      };
      
      // Try to include photo if it's a data URL and browser supports file sharing
      if (photo && photo.startsWith('data:')) {
        try {
          const response = await fetch(photo);
          const blob = await response.blob();
          const file = new File([blob], 'site-photo.jpg', { type: 'image/jpeg' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareParams.files = [file];
          }
        } catch (e) {
          console.warn('Web: Failed to prepare photo for sharing:', e);
        }
      }

      // If we are sharing files, some browsers work better if url is merged into text
      // but others want it separately. Keeping it consistent for now.
      if (url && !shareParams.files) {
        shareParams.url = url;
      }

      await navigator.share(shareParams);
    } else {
      // Fallback to WhatsApp link (Text only)
      window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank');
    }
  } catch (error) {
    console.error('Error sharing visit details:', error);
    const fallbackText = `${text}${url ? '\n\nLocation: ' + url : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(fallbackText)}`, '_blank');
  }
}

