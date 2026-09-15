import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const THUMBNAIL_WIDTH = 480;

export async function createPhotoThumbnail(sourceUri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(sourceUri);
    context.resize({ height: null, width: THUMBNAIL_WIDTH });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      compress: 0.76,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return sourceUri;
  }
}
