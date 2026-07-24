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
  photoOnly?: boolean;
}

export async function shareVisitDetails({ title, text, url, photo, photoOnly }: ShareData) {
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
          const fileName = `site_photo_${Date.now()}.jpg`;
          const base64Data = photo.includes(',') ? photo.split(',')[1] : photo;
          
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
            // @ts-ignore
            encoding: 'base64'
          });
          
          const fileUri = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
          });
          
          shareOptions.files = [fileUri.uri];
          
          if (photoOnly) {
            delete shareOptions.text;
            delete shareOptions.title;
          }
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
      const shareParams: any = {};
      if (title) shareParams.title = title;
      if (whatsappText) shareParams.text = whatsappText;
      
      // Try to include photo if it's a data URL and browser supports file sharing
      if (photo && photo.startsWith('data:')) {
        try {
          const response = await fetch(photo);
          const blob = await response.blob();
          const file = new File([blob], 'site-photo.jpg', { type: 'image/jpeg' });
          
          const candidateParams = {
            ...shareParams,
            files: [file]
          };

          if (navigator.canShare && navigator.canShare(candidateParams)) {
            shareParams.files = [file];
          }
        } catch (e) {
          console.warn('Web: Failed to prepare photo for sharing:', e);
        }
      }

      // Handle URL parameter
      if (url) {
        if (!shareParams.files) {
          shareParams.url = url;
        } else {
          // If we have files, check if we can share both files and URL
          const candidateWithUrl = {
            ...shareParams,
            url
          };
          if (navigator.canShare && navigator.canShare(candidateWithUrl)) {
            shareParams.url = url;
          }
        }
      }

      // Safety check: ensure at least one known standard field is present
      if (!shareParams.title && !shareParams.text && !shareParams.url) {
        shareParams.title = title || 'Site Detail';
        shareParams.text = whatsappText;
      }

      // Perform final feature detection on the exact parameters to be shared
      if (navigator.canShare && !navigator.canShare(shareParams)) {
        // If the combined check fails, strip files to fall back to a safe text/url share
        delete shareParams.files;
        if (url) {
          shareParams.url = url;
        }
        shareParams.title = title || 'Site Detail';
        shareParams.text = whatsappText;
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

