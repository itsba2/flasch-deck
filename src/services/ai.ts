import { GoogleGenerativeAI } from '@google/generative-ai';
import { Card } from '../global';

/**
 * Helper to clean JSON string from Gemini response
 */
function cleanJsonResponse(text: string): any {
  let cleaned = text.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return JSON.parse(cleaned.trim());
}

/**
 * Autocompletes card details for a given German word and card type.
 * Returns parsed JSON object.
 */
export async function autofillCard(
  word: string,
  type: 'noun' | 'verb' | 'adjective' | 'other',
  apiKey: string
): Promise<any> {
  if (!apiKey) throw new Error('Gemini API anahtarı ayarlanmamış.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  let prompt = '';

  if (type === 'noun') {
    prompt = `Almanca kelime: "${word}". Bu bir isim (Noun). Lütfen bu kelimenin detaylarını aşağıdaki JSON formatında döndür. Cihazda okunacağı için lütfen sadece geçerli bir JSON nesnesi döndür, başka hiçbir metin veya markdown biçimlendirmesi (kod blokları hariç) ekleme.
{
  "turkish": "kelimenin Türkçe karşılığı",
  "article": "der" veya "die" veya "das" (sadece bu üçünden biri)",
  "plural": "kelimenin çoğul hali (artikel olmadan, örn: Hunde)",
  "exampleGerman": "bu kelimeyi içeren A1-B1 seviyesinde Almanca örnek cümle",
  "exampleTurkish": "Almanca örnek cümlenin Türkçe çevirisi"
}`;
  } else if (type === 'verb') {
    prompt = `Almanca kelime: "${word}". Bu bir fiil (Verb). Lütfen bu kelimenin detaylarını aşağıdaki JSON formatında döndür. Cihazda okunacağı için lütfen sadece geçerli bir JSON nesnesi döndür, başka hiçbir metin veya markdown biçimlendirmesi ekleme.
{
  "turkish": "kelimenin Türkçe karşılığı",
  "praesens": "fiilin 3. tekil şahıs Präsens çekimi (örn: geht)",
  "praeteritum": "fiilin 3. tekil şahıs Präteritum çekimi (örn: ging)",
  "perfekt": "fiilin Perfekt çekimi yardımcı fiiliyle birlikte (örn: ist gegangen veya hat gemacht)",
  "exampleGerman": "bu fiili içeren A1-B1 seviyesinde Almanca örnek cümle",
  "exampleTurkish": "Almanca örnek cümlenin Türkçe çevirisi"
}`;
  } else if (type === 'adjective') {
    prompt = `Almanca kelime: "${word}". Bu bir sıfat (Adjective). Lütfen bu kelimenin detaylarını aşağıdaki JSON formatında döndür. Cihazda okunacağı için lütfen sadece geçerli bir JSON nesnesi döndür, başka hiçbir metin veya açıklama ekleme.
{
  "turkish": "kelimenin Türkçe karşılığı",
  "comparative": "sıfatın derecelendirilmiş hali (comparative, örn: schöner)",
  "superlative": "sıfatın en üstünlük hali (superlative, örn: am schönsten)",
  "exampleGerman": "bu sıfatı içeren A1-B1 seviyesinde Almanca örnek cümle",
  "exampleTurkish": "Almanca örnek cümlenin Türkçe çevirisi"
}`;
  } else {
    prompt = `Almanca kelime veya ifade: "${word}". Lütfen bu kelimenin detaylarını aşağıdaki JSON formatında döndür. Cihazda okunacağı için lütfen sadece geçerli bir JSON nesnesi döndür, başka hiçbir metin veya açıklama ekleme.
{
  "turkish": "kelimenin/ifadenin Türkçe karşılığı",
  "exampleGerman": "bu ifadeyi içeren A1-B1 seviyesinde Almanca örnek cümle",
  "exampleTurkish": "Almanca örnek cümlenin Türkçe çevirisi"
}`;
  }

  const result = await model.generateContent(prompt);
  const responseText = await result.response.text();
  return cleanJsonResponse(responseText);
}

/**
 * Generates grammar explanation in Turkish comparing German rules to Turkish.
 */
export async function explainGrammar(card: Card, apiKey: string): Promise<string> {
  if (!apiKey)
    return 'Gramatik açıklaması alabilmek için lütfen ayarlardan Gemini API anahtarınızı girin.';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  let cardDetails = `Kelime: ${card.german} (${card.turkish})\nTür: ${card.type}`;
  if (card.type === 'noun') {
    cardDetails += `\nArtikel: ${card.article}\nÇoğul: ${card.plural}`;
  } else if (card.type === 'verb' && card.conjugation) {
    cardDetails += `\nPräsens: ${card.conjugation.praesens}\nPräteritum: ${card.conjugation.praeteritum}\nPerfekt: ${card.conjugation.perfekt}`;
  } else if (card.type === 'adjective' && card.comparison) {
    cardDetails += `\nComparative: ${card.comparison.comparative}\nSuperlative: ${card.comparison.superlative}`;
  }
  if (card.exampleGerman) {
    cardDetails += `\nÖrnek Cümle: ${card.exampleGerman}\nÖrnek Çeviri: ${card.exampleTurkish}`;
  }

  const prompt = `Aşağıdaki Almanca kelime kartını incele. 
Türkçe konuşan bir Almanca öğrencisine, bu kelimenin Almanca dilbilgisi kurallarını ve kullanım ipuçlarını Türkçe olarak açıkla.
Eğer isim ise artikelinin (der/die/das) öneminden bahset. Eğer fiil ise düzensiz çekimlerini ve edat (Präposition) alıp almadığını belirt. 
Özellikle bu Almanca dilbilgisi yapısını Türkçe dilbilgisi yapılarıyla karşılaştır (örneğin Almanca yönelme/belirtme durumlarının Türkçe yönelme -e/-a veya belirtme -ı/-i ekleriyle olan ilişkisi/farkı).
Açıklamanı kısa, anlaşılır, madde işaretleri içeren ve motive edici bir dille yaz (maksimum 150 kelime).

KART DETAYLARI:
${cardDetails}`;

  const result = await model.generateContent(prompt);
  return await result.response.text();
}

/**
 * Generates a chunk of cards (up to 5) for a deck using Google Gemini API.
 */
export async function generateDeckCardsChunk(
  deckName: string,
  deckDesc: string,
  types: string[],
  count: number,
  excludedWords: string[],
  apiKey: string
): Promise<any> {
  if (!apiKey) throw new Error('Gemini API anahtarı ayarlanmamış.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const typesStr = types.join(', ');
  const excludedStr = excludedWords.length > 0 ? excludedWords.join(', ') : 'Hiçbiri';

  const prompt = `Aşağıdaki özelliklere uygun Almanca kelime kartları oluştur.
Deste Konusu/Adı: "${deckName}"
Deste Açıklaması: "${deckDesc}"
Oluşturulacak Kart Sayısı: ${count}
İzin Verilen Kelime Türleri: ${typesStr}

Lütfen DAHA ÖNCE OLUŞTURULMUŞ olan şu Almanca kelimeleri OLUŞTURMA: ${excludedStr}

Lütfen bu kelimelerin detaylarını aşağıdaki JSON array formatında döndür. Cihazda okunacağı için lütfen sadece geçerli bir JSON array döndür. Başka hiçbir açıklama, metin veya markdown (kod blokları hariç) ekleme.

Her kart nesnesi şu alanları içermelidir:
{
  "type": "noun" veya "verb" veya "adjective" veya "other" (seçilen türlerden biri),
  "german": "Almanca kelime (artikel olmadan, ilk harfi büyük isim ise)",
  "turkish": "Türkçe karşılığı",
  "exampleGerman": "bu kelimeyi içeren A1-B1 seviyesinde Almanca örnek cümle",
  "exampleTurkish": "örnek cümlenin Türkçe çevirisi",
  
  // EĞER "type" "noun" ise:
  "article": "der" veya "die" veya "das",
  "plural": "çoğul hali (artikel olmadan)",
  
  // EĞER "type" "verb" ise:
  "conjugation": {
    "praesens": "3. tekil şahıs Präsens çekimi",
    "praeteritum": "3. tekil şahıs Präteritum çekimi",
    "perfekt": "Perfekt çekimi yardımcı fiiliyle birlikte (örn: ist gegangen veya hat gemacht)"
  },
  
  // EĞER "type" "adjective" ise:
  "comparison": {
    "comparative": "karşılaştırma derecesi (örn: schöner)",
    "superlative": "en üstünlük derecesi (örn: am schönsten)"
  }
}`;

  const result = await model.generateContent(prompt);
  const responseText = await result.response.text();
  return cleanJsonResponse(responseText);
}
