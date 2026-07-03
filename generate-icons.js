import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

const ICON_SOURCE = './public/icon.jpg';

const ICON_CONFIGS = [
  // MDPI
  { width: 48, height: 48, dest: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png' },
  { width: 48, height: 48, dest: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png' },
  { width: 108, height: 108, dest: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png' },

  // HDPI
  { width: 72, height: 72, dest: 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png' },
  { width: 72, height: 72, dest: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png' },
  { width: 162, height: 162, dest: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png' },

  // XHDPI
  { width: 96, height: 96, dest: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png' },
  { width: 96, height: 96, dest: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png' },
  { width: 216, height: 216, dest: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png' },

  // XXHDPI
  { width: 144, height: 144, dest: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png' },
  { width: 144, height: 144, dest: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png' },
  { width: 324, height: 324, dest: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png' },

  // XXXHDPI
  { width: 192, height: 192, dest: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png' },
  { width: 192, height: 192, dest: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png' },
  { width: 432, height: 432, dest: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png' }
];

async function generate() {
  try {
    console.log(`Reading source icon from ${ICON_SOURCE}...`);
    const image = await Jimp.read(ICON_SOURCE);
    
    for (const config of ICON_CONFIGS) {
      console.log(`Generating ${config.width}x${config.height} icon: ${config.dest}`);
      
      // Resizing with Jimp (supports both function call style and config style in Jimp v1)
      const resized = image.clone();
      if (typeof resized.resize === 'function') {
        resized.resize({ w: config.width, h: config.height });
      }
      
      // Ensure destination directory exists
      const dir = path.dirname(config.dest);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      await resized.write(config.dest);
    }
    
    console.log('All launcher icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generate();
