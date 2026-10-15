import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { PaperTheme } from '../papers/paperThemes';

type ExportArgs = {
  title: string;
  contentHtml: string;
  paper: PaperTheme;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const isIos = Platform.OS === 'ios';

export async function exportNotePdf({
  title,
  contentHtml,
  paper,
}: ExportArgs) {
  const safeTitle = escapeHtml(title || 'Dear Diary');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @page { size: A4; margin: ${isIos ? '0' : '18mm 17mm'}; }

          html, body {
            margin: 0;
            padding: 0;
          }

          body {
            color: ${paper.textColor};
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.7;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .paper {
            min-height: 100%;
            padding: 0;
            ${paper.pdfCss}
            background-origin: border-box;
          }

          h1 {
            font-size: 22pt;
            line-height: 1.25;
            margin: 0 0 18pt;
          }

          h2 {
            font-size: 16pt;
            margin: 18pt 0 8pt;
          }

          p { margin: 0 0 10pt; }
          li { margin-bottom: 4pt; }
          img { max-width: 100%; }

          blockquote {
            border-left: 3px solid #CBB8D2;
            margin-left: 0;
            padding-left: 12pt;
          }
        </style>
      </head>

      <body>
        <main class="paper">
          <h1>${safeTitle}</h1>
          ${contentHtml || '<p></p>'}
        </main>
      </body>
    </html>
  `;

  try {
    // PDF'yi oluştur ve aynı zamanda Base64 içeriğini al.
    const result = await Print.printToFileAsync({
      html,
      width: 595,
      height: 842,
      base64: true,
      // iOS @page kenar boşluğunu yok saydığı için boşluk burada veriliyor (pt).
      ...(isIos ? { margins: { left: 48, right: 48, top: 51, bottom: 51 } } : {}),
    });

    if (!result.base64) {
      throw new Error('PDF içeriği alınamadı.');
    }

    // PDF'yi uygulamanın kendi belge klasörüne yeniden yaz.
    const directory = FileSystem.documentDirectory;

    if (!directory) {
      throw new Error('Belge klasörüne erişilemiyor.');
    }

    const pdfUri = `${directory}dear-diary-${Date.now()}.pdf`;

    await FileSystem.writeAsStringAsync(
      pdfUri,
      result.base64,
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );

    const fileInfo = await FileSystem.getInfoAsync(pdfUri);

    if (!fileInfo.exists) {
      throw new Error('PDF dosyası kaydedilemedi.');
    }

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        'Paylaşım kullanılamıyor',
        'PDF oluşturuldu ancak bu cihazda paylaşım özelliği kullanılamıyor.'
      );
      return;
    }

    // Oluşturulan yeni PDF dosyasını paylaş.
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Dear Diary — PDF paylaş',
    });
  } catch (error) {
    console.error('PDF dışa aktarma hatası:', error);

    Alert.alert(
      'PDF paylaşılamadı',
      'PDF hazırlanırken veya paylaşılırken bir sorun oluştu. Lütfen tekrar deneyin.'
    );
  }
}