import sharp from 'sharp';
import { SocialMediaSettings } from '@/services/socialMedia';

export interface ProcessImageOptions {
    imageUrl: string;
    logoUrl?: string | null;
    logoPosition?: string;
    logoSize?: number;
}

export async function processStoryImage(options: ProcessImageOptions): Promise<Buffer> {
    const { imageUrl, logoUrl, logoPosition = 'bottom-right', logoSize = 80 } = options;

    // Fetch the main image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    let pipeline = sharp(imageBuffer);

    // Standard story aspect ratio 9:16
    // We'll resize to fit a standard 1080x1920 story area
    pipeline = pipeline.resize(1080, 1920, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
    });

    if (logoUrl) {
        try {
            const logoResponse = await fetch(logoUrl);
            const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());

            // Resize logo based on settings
            const resizedLogo = await sharp(logoBuffer)
                .resize(logoSize)
                .toBuffer();

            const metadata = await pipeline.metadata();
            const width = metadata.width || 1080;
            const height = metadata.height || 1920;

            let left = 20;
            let top = 20;

            const padding = 40;

            switch (logoPosition) {
                case 'top-left':
                    left = padding;
                    top = padding;
                    break;
                case 'top-right':
                    left = width - logoSize - padding;
                    top = padding;
                    break;
                case 'bottom-left':
                    left = padding;
                    top = height - logoSize - padding * 2; // Offset for safety
                    break;
                case 'bottom-right':
                    left = width - logoSize - padding;
                    top = height - logoSize - padding * 2;
                    break;
                case 'center':
                    left = Math.floor((width - logoSize) / 2);
                    top = Math.floor((height - logoSize) / 2);
                    break;
            }

            pipeline = pipeline.composite([
                {
                    input: resizedLogo,
                    top: Math.max(0, top),
                    left: Math.max(0, left)
                }
            ]);
        } catch (error) {
            console.error('Error processing logo:', error);
            // Continue without logo if it fails
        }
    }

    // Optimize for web (JPEG with good compression)
    return await pipeline
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
}
