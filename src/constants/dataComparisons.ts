/**
 * Everyday things a volume of data could be, used to give the dashboard's
 * "Data Posted" card a human sense of scale. Sizes are approximate by
 * design: they exist to be relatable, not authoritative, so each one is
 * rounded to the figure people actually quote.
 *
 * Entries are picked by index at render time, so adding to the list is safe
 * but reordering changes which comparison a given seed lands on.
 */
export interface DataComparison {
  /** Size of one of these, in bytes. */
  bytes: number;
  singular: string;
  plural: string;
}

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const TB = GB * 1024;

export const DATA_COMPARISONS: DataComparison[] = [
  // Storage media through the ages
  { bytes: 1.44 * MB, singular: 'floppy disk', plural: 'floppy disks' },
  { bytes: 700 * MB, singular: 'CD-ROM', plural: 'CD-ROMs' },
  { bytes: 4.7 * GB, singular: 'DVD', plural: 'DVDs' },
  { bytes: 25 * GB, singular: 'Blu-ray disc', plural: 'Blu-ray discs' },
  { bytes: 100 * MB, singular: 'Zip disk', plural: 'Zip disks' },
  { bytes: 3.75 * MB, singular: "IBM's first hard drive", plural: "IBM's first hard drives" },
  { bytes: 80, singular: 'punch card', plural: 'punch cards' },
  { bytes: 5 * GB, singular: 'first-generation iPod', plural: 'first-generation iPods' },
  { bytes: 32 * GB, singular: 'entry-level smartphone', plural: 'entry-level smartphones' },
  { bytes: 1 * TB, singular: 'laptop SSD', plural: 'laptop SSDs' },
  { bytes: 16 * GB, singular: 'USB thumb drive', plural: 'USB thumb drives' },
  { bytes: 90 * MB, singular: 'MiniDisc', plural: 'MiniDiscs' },
  { bytes: 650 * MB, singular: 'burned mix CD', plural: 'burned mix CDs' },
  { bytes: 200 * MB, singular: 'SmartMedia card', plural: 'SmartMedia cards' },

  // Vintage hardware and its famously tiny memory
  { bytes: 64 * KB, singular: 'Commodore 64', plural: 'Commodore 64s' },
  { bytes: 128 * KB, singular: 'original Macintosh', plural: 'original Macintoshes' },
  { bytes: 72 * KB, singular: 'Apollo Guidance Computer', plural: 'Apollo Guidance Computers' },
  { bytes: 4 * KB, singular: 'Atari 2600 cartridge', plural: 'Atari 2600 cartridges' },
  { bytes: 40 * KB, singular: 'copy of Super Mario Bros.', plural: 'copies of Super Mario Bros.' },
  { bytes: 8 * MB, singular: 'Nintendo 64 cartridge', plural: 'Nintendo 64 cartridges' },
  { bytes: 32 * KB, singular: 'Game Boy cartridge', plural: 'Game Boy cartridges' },
  { bytes: 16 * KB, singular: 'ZX Spectrum', plural: 'ZX Spectrums' },
  { bytes: 640 * KB, singular: 'MS-DOS memory limit', plural: 'MS-DOS memory limits' },
  { bytes: 1.44 * MB * 13, singular: 'Windows 95 floppy set', plural: 'Windows 95 floppy sets' },
  { bytes: 250 * MB, singular: 'entire NES game library', plural: 'entire NES game libraries' },
  { bytes: 3 * GB, singular: 'complete Game Boy library', plural: 'complete Game Boy libraries' },

  // Music and audio
  { bytes: 3.5 * MB, singular: 'MP3 track', plural: 'MP3 tracks' },
  { bytes: 40 * MB, singular: 'lossless FLAC track', plural: 'lossless FLAC tracks' },
  { bytes: 176400, singular: 'second of CD audio', plural: 'seconds of CD audio' },
  { bytes: 10.6 * MB, singular: 'minute of CD audio', plural: 'minutes of CD audio' },
  { bytes: 144 * MB, singular: 'hour of high-quality streaming', plural: 'hours of high-quality streaming' },
  { bytes: 30 * MB, singular: 'podcast episode', plural: 'podcast episodes' },
  { bytes: 100 * KB, singular: 'minute of voice note', plural: 'minutes of voice notes' },
  { bytes: 500 * MB, singular: 'full studio album in lossless', plural: 'full studio albums in lossless' },
  { bytes: 4 * KB, singular: 'ringtone', plural: 'ringtones' },
  { bytes: 8 * MB, singular: 'audiobook chapter', plural: 'audiobook chapters' },

  // Video
  { bytes: 350 * MB, singular: 'minute of 4K phone video', plural: 'minutes of 4K phone video' },
  { bytes: 1.4 * GB, singular: 'DVD-quality movie', plural: 'DVD-quality movies' },
  { bytes: 6 * GB, singular: '1080p movie', plural: '1080p movies' },
  { bytes: 15 * GB, singular: '4K movie', plural: '4K movies' },
  { bytes: 3 * GB, singular: 'hour of 1080p streaming', plural: 'hours of 1080p streaming' },
  { bytes: 7 * GB, singular: 'hour of 4K streaming', plural: 'hours of 4K streaming' },
  { bytes: 540 * MB, singular: 'hour of video calls', plural: 'hours of video calls' },
  { bytes: 15 * MB, singular: 'TikTok video', plural: 'TikTok videos' },
  { bytes: 5 * MB, singular: 'minute of 1080p YouTube', plural: 'minutes of 1080p YouTube' },
  { bytes: 24.8 * MB, singular: 'uncompressed 4K frame', plural: 'uncompressed 4K frames' },
  { bytes: 700 * KB, singular: 'animated GIF', plural: 'animated GIFs' },
  { bytes: 2 * GB, singular: 'season of a sitcom', plural: 'seasons of a sitcom' },

  // Photos and images
  { bytes: 2 * MB, singular: 'smartphone photo', plural: 'smartphone photos' },
  { bytes: 25 * MB, singular: 'RAW camera photo', plural: 'RAW camera photos' },
  { bytes: 500 * KB, singular: 'web-sized JPEG', plural: 'web-sized JPEGs' },
  { bytes: 3 * MB, singular: 'Instagram post', plural: 'Instagram posts' },
  { bytes: 1.2 * MB, singular: 'screenshot', plural: 'screenshots' },
  { bytes: 8 * MB, singular: 'Hubble image', plural: 'Hubble images' },
  { bytes: 120 * MB, singular: 'Webb telescope image', plural: 'Webb telescope images' },
  { bytes: 500 * KB, singular: 'scanned page', plural: 'scanned pages' },
  { bytes: 8 * GB, singular: 'wedding photo album', plural: 'wedding photo albums' },

  // Text, books and documents
  { bytes: 280, singular: 'tweet', plural: 'tweets' },
  { bytes: 160, singular: 'text message', plural: 'text messages' },
  { bytes: 4, singular: 'emoji', plural: 'emoji' },
  { bytes: 2 * KB, singular: 'plain-text email', plural: 'plain-text emails' },
  { bytes: 2 * KB, singular: 'page of typed text', plural: 'pages of typed text' },
  { bytes: 800 * KB, singular: 'ebook novel', plural: 'ebook novels' },
  { bytes: 1.2 * MB, singular: 'copy of Moby-Dick', plural: 'copies of Moby-Dick' },
  { bytes: 4.7 * MB, singular: 'copy of the Bible', plural: 'copies of the Bible' },
  { bytes: 5.3 * MB, singular: "copy of Shakespeare's complete works", plural: "copies of Shakespeare's complete works" },
  { bytes: 45 * KB, singular: 'copy of the US Constitution', plural: 'copies of the US Constitution' },
  { bytes: 3 * KB, singular: 'Rosetta Stone inscription', plural: 'Rosetta Stone inscriptions' },
  { bytes: 300 * MB, singular: 'Encyclopaedia Britannica', plural: 'Encyclopaedia Britannicas' },
  { bytes: 22 * GB, singular: "copy of Wikipedia's text", plural: "copies of Wikipedia's text" },
  { bytes: 100 * GB, singular: 'copy of Wikipedia with images', plural: 'copies of Wikipedia with images' },
  { bytes: 10 * TB, singular: 'Library of Congress text collection', plural: 'Library of Congress text collections' },
  { bytes: 200 * KB, singular: 'resume PDF', plural: 'resume PDFs' },
  { bytes: 50 * KB, singular: 'word processor document', plural: 'word processor documents' },
  { bytes: 3 * MB, singular: 'slide deck', plural: 'slide decks' },
  { bytes: 300 * KB, singular: 'tax return PDF', plural: 'tax return PDFs' },
  { bytes: 25 * MB, singular: 'email attachment limit', plural: 'email attachment limits' },
  { bytes: 20 * MB, singular: 'phone book', plural: 'phone books' },

  // Software and games
  { bytes: 2.39 * MB, singular: 'copy of shareware Doom', plural: 'copies of shareware Doom' },
  { bytes: 40 * MB, singular: 'Windows 95 install', plural: 'Windows 95 installs' },
  { bytes: 5 * GB, singular: 'modern Windows ISO', plural: 'modern Windows ISOs' },
  { bytes: 500 * MB, singular: 'Minecraft install', plural: 'Minecraft installs' },
  { bytes: 30 * GB, singular: 'battle royale install', plural: 'battle royale installs' },
  { bytes: 150 * GB, singular: 'blockbuster shooter install', plural: 'blockbuster shooter installs' },
  { bytes: 350 * MB, singular: 'code editor install', plural: 'code editor installs' },
  { bytes: 50 * MB, singular: 'smartphone app', plural: 'smartphone apps' },
  { bytes: 1.2 * MB, singular: 'copy of the first Linux kernel', plural: 'copies of the first Linux kernel' },
  { bytes: 5 * KB, singular: 'copy of the first web page', plural: 'copies of the first web page' },
  { bytes: 2.5 * MB, singular: 'average web page load', plural: 'average web page loads' },

  // Science, space and chains
  { bytes: 750 * MB, singular: 'compressed human genome', plural: 'compressed human genomes' },
  { bytes: 1.7 * MB, singular: 'day of Voyager 1 transmissions', plural: 'days of Voyager 1 transmissions' },
  { bytes: 31 * MB, singular: 'day of Mars rover downlink', plural: 'days of Mars rover downlink' },
  { bytes: 1 * MB, singular: 'Bitcoin block', plural: 'Bitcoin blocks' },
  { bytes: 600 * GB, singular: 'Bitcoin blockchain', plural: 'Bitcoin blockchains' },
  { bytes: 1.2 * TB, singular: 'archive Ethereum node', plural: 'archive Ethereum nodes' },
  { bytes: 128 * KB, singular: 'EIP-4844 blob', plural: 'EIP-4844 blobs' },
  { bytes: 4 * MB, singular: 'weather satellite scan', plural: 'weather satellite scans' },
  { bytes: 200 * MB, singular: 'seismograph day', plural: 'seismograph days' },
  { bytes: 12 * MB, singular: 'MRI scan', plural: 'MRI scans' },
  { bytes: 60 * KB, singular: 'Winamp skin', plural: 'Winamp skins' },
];
