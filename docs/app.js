// Interactive Preview Flashcard Logic
const sampleCards = [
  {
    german: 'Hund',
    article: 'der',
    plural: 'Hunde',
    turkish: 'köpek',
    exampleGer: 'Der Hund bellt im Garten.',
    exampleTr: 'Köpek bahçede havlıyor.'
  },
  {
    german: 'Katze',
    article: 'die',
    plural: 'Katzen',
    turkish: 'kedi',
    exampleGer: 'Die Katze schläft auf dem Sofa.',
    exampleTr: 'Kedi kanepede uyuyor.'
  },
  {
    german: 'Buch',
    article: 'das',
    plural: 'Bücher',
    turkish: 'kitap',
    exampleGer: 'Ich lese ein interessantes Buch.',
    exampleTr: 'İlginç bir kitap okuyorum.'
  },
  {
    german: 'Apfel',
    article: 'der',
    plural: 'Äpfel',
    turkish: 'elma',
    exampleGer: 'Der rote Apfel schmeckt süß.',
    exampleTr: 'Kırmızı elmanın tadı tatlı.'
  },
  {
    german: 'Blume',
    article: 'die',
    plural: 'Blumen',
    turkish: 'çiçek',
    exampleGer: 'Die Blume blüht im Frühling.',
    exampleTr: 'Çiçek ilkbaharda açar.'
  },
  {
    german: 'Fahrrad',
    article: 'das',
    plural: 'Fahrräder',
    turkish: 'bisiklet',
    exampleGer: 'Mein Fahrrad steht vor dem Haus.',
    exampleTr: 'Bisikletim evin önünde duruyor.'
  }
];

let currentCardIndex = 0;
let isFlipped = false;

function toggleCardFlip() {
  const card = document.getElementById('previewCard');
  isFlipped = !isFlipped;

  if (isFlipped) {
    card.classList.add('flipped');
  } else {
    card.classList.remove('flipped');

    // When flipping back to the front, schedule updating contents to the next card
    // after the rotation animation is halfway finished (300ms) so the text change isn't jarring
    setTimeout(() => {
      currentCardIndex = (currentCardIndex + 1) % sampleCards.length;
      updateCardContents(sampleCards[currentCardIndex]);
    }, 300);
  }
}

function updateCardContents(cardData) {
  const frontEl = document.querySelector('.card-front');
  const backEl = document.querySelector('.card-back');

  // Update Front (German)
  frontEl.querySelector('.word-german').textContent = cardData.german;
  frontEl.querySelector('.plural-form').textContent = `Plural: ${cardData.plural}`;

  const articleBadge = frontEl.querySelector('.article-badge');
  articleBadge.className = `article-badge ${cardData.article}`;
  articleBadge.textContent = cardData.article;

  // Update Back (Turkish)
  backEl.querySelector('.word-turkish').textContent = cardData.turkish;
  backEl.querySelector('.example-ger').textContent = cardData.exampleGer;
  backEl.querySelector('.example-tr').textContent = cardData.exampleTr;
}

// GitHub Releases API Fetching
async function fetchLatestReleases() {
  const repo = 'itsba2/flasch-deck';
  const apiEndpoint = `https://api.github.com/repos/${repo}/releases/latest`;

  // Elements
  const releaseVersion = document.getElementById('releaseVersion');

  const winDownloadBtn = document.getElementById('winDownloadBtn');
  const winCount = document.getElementById('winCount');

  const macDownloadBtn = document.getElementById('macDownloadBtn');
  const macCount = document.getElementById('macCount');

  const linuxDownloadBtn = document.getElementById('linuxDownloadBtn');
  const linuxCount = document.getElementById('linuxCount');

  try {
    const response = await fetch(apiEndpoint);
    if (!response.ok) {
      throw new Error(`GitHub API HTTP hata kodu: ${response.status}`);
    }

    const data = await response.json();
    const version = data.tag_name;

    // Update main release tag badge
    releaseVersion.textContent = `Son Sürüm: ${version}`;

    let hasWin = false,
      hasMac = false,
      hasLinux = false;

    // Parse assets
    data.assets.forEach((asset) => {
      const name = asset.name.toLowerCase();
      const downloadCount = asset.download_count;
      const downloadUrl = asset.browser_download_url;

      if (name.endsWith('.exe')) {
        winDownloadBtn.href = downloadUrl;
        winCount.textContent = `İndirme: ${downloadCount} kez`;
        hasWin = true;
      } else if (name.endsWith('.dmg')) {
        macDownloadBtn.href = downloadUrl;
        macCount.textContent = `İndirme: ${downloadCount} kez`;
        hasMac = true;
      } else if (name.endsWith('.appimage')) {
        linuxDownloadBtn.href = downloadUrl;
        linuxCount.textContent = `İndirme: ${downloadCount} kez`;
        hasLinux = true;
      }
    });

    // Fallback if specific assets are not found under the release
    if (!hasWin) handleAssetFallback(winCount);
    if (!hasMac) handleAssetFallback(macCount);
    if (!hasLinux) handleAssetFallback(linuxCount);
  } catch (error) {
    console.error('Sürümler çekilirken hata oluştu, yerel varsayılanlar yükleniyor:', error);

    // Graceful fallback to static data
    releaseVersion.textContent = 'Son Sürüm: v1.2.0';

    handleAssetFallback(winCount);
    handleAssetFallback(macCount);
    handleAssetFallback(linuxCount);
  }
}

function handleAssetFallback(countElement) {
  countElement.textContent = '';
}

// Initializations on page load
document.addEventListener('DOMContentLoaded', () => {
  // Populate first card
  updateCardContents(sampleCards[0]);

  // Bind interactive preview click handler
  const previewCard = document.getElementById('previewCard');
  if (previewCard) {
    previewCard.addEventListener('click', toggleCardFlip);
  }

  // Fetch releases
  fetchLatestReleases();
});
