/**
 * Everyday things a volume of data could be, used to give the dashboard's
 * "Data Posted" card a human sense of scale. Sizes are approximate by
 * design: they exist to be relatable, not authoritative, so each one is
 * rounded to the figure people actually quote.
 *
 * Every entry must be fixed in size for good: a format's capacity (a DVD,
 * an LTO tape), a finished historical artifact (the first web page, the
 * Apollo Guidance Computer's memory), a text that will not be rewritten
 * (the US Constitution), or arithmetic that cannot drift (a second of CD
 * audio, an uncompressed 4K frame). Anything that grows or shifts with the
 * industry does not belong here: a blockchain's size, an archive node, an
 * app install, a typical phone photo, or "an average web page" would all
 * quietly turn this card into misinformation as the years pass.
 *
 * Entries are picked by index at render time, so appending is safe but
 * reordering changes which comparison a given seed lands on.
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
  // Storage formats, fixed by their specifications
  { bytes: 1.44 * MB, singular: 'floppy disk', plural: 'floppy disks' },
  { bytes: 80, singular: 'punch card', plural: 'punch cards' },
  { bytes: 80 * KB, singular: '8-inch floppy disk', plural: '8-inch floppy disks' },
  { bytes: 360 * KB, singular: '5.25-inch floppy disk', plural: '5.25-inch floppy disks' },
  { bytes: 120 * MB, singular: 'LS-120 SuperDisk', plural: 'LS-120 SuperDisks' },
  { bytes: 100 * MB, singular: 'Zip disk', plural: 'Zip disks' },
  { bytes: 2 * GB, singular: 'Jaz disk', plural: 'Jaz disks' },
  { bytes: 700 * MB, singular: 'CD-ROM', plural: 'CD-ROMs' },
  { bytes: 650 * MB, singular: 'burned mix CD', plural: 'burned mix CDs' },
  { bytes: 90 * MB, singular: 'MiniDisc', plural: 'MiniDiscs' },
  { bytes: 200 * MB, singular: 'SmartMedia card', plural: 'SmartMedia cards' },
  { bytes: 1.3 * GB, singular: 'DAT cassette', plural: 'DAT cassettes' },
  { bytes: 4.7 * GB, singular: 'DVD', plural: 'DVDs' },
  { bytes: 8.5 * GB, singular: 'dual-layer DVD', plural: 'dual-layer DVDs' },
  { bytes: 15 * GB, singular: 'HD DVD', plural: 'HD DVDs' },
  { bytes: 30 * GB, singular: 'dual-layer HD DVD', plural: 'dual-layer HD DVDs' },
  { bytes: 25 * GB, singular: 'Blu-ray disc', plural: 'Blu-ray discs' },
  { bytes: 50 * GB, singular: 'dual-layer Blu-ray disc', plural: 'dual-layer Blu-ray discs' },
  { bytes: 100 * GB, singular: 'UHD Blu-ray disc', plural: 'UHD Blu-ray discs' },
  { bytes: 800 * GB, singular: 'LTO-4 tape cartridge', plural: 'LTO-4 tape cartridges' },
  { bytes: 2.5 * TB, singular: 'LTO-6 tape cartridge', plural: 'LTO-6 tape cartridges' },
  { bytes: 18 * TB, singular: 'LTO-9 tape cartridge', plural: 'LTO-9 tape cartridges' },
  { bytes: 3.75 * MB, singular: "IBM's first hard drive", plural: "IBM's first hard drives" },
  { bytes: 5 * GB, singular: 'first-generation iPod', plural: 'first-generation iPods' },
  { bytes: 2.9 * KB, singular: 'QR code at full capacity', plural: 'QR codes at full capacity' },

  // Game media, frozen the day the format died
  { bytes: 4 * KB, singular: 'Atari 2600 cartridge', plural: 'Atari 2600 cartridges' },
  { bytes: 40 * KB, singular: 'copy of Super Mario Bros.', plural: 'copies of Super Mario Bros.' },
  { bytes: 32 * KB, singular: 'Game Boy cartridge', plural: 'Game Boy cartridges' },
  { bytes: 1 * MB, singular: 'copy of Pokemon Red', plural: 'copies of Pokemon Red' },
  { bytes: 8 * MB, singular: 'Nintendo 64 cartridge', plural: 'Nintendo 64 cartridges' },
  { bytes: 32 * MB, singular: 'copy of Ocarina of Time', plural: 'copies of Ocarina of Time' },
  { bytes: 512 * MB, singular: 'Nintendo DS cartridge', plural: 'Nintendo DS cartridges' },
  { bytes: 1.2 * GB, singular: 'Dreamcast GD-ROM', plural: 'Dreamcast GD-ROMs' },
  { bytes: 1.5 * GB, singular: 'GameCube mini-DVD', plural: 'GameCube mini-DVDs' },
  { bytes: 1.8 * GB, singular: 'UMD disc', plural: 'UMD discs' },
  { bytes: 2 * MB, singular: 'complete Atari 2600 library', plural: 'complete Atari 2600 libraries' },
  { bytes: 250 * MB, singular: 'complete NES library', plural: 'complete NES libraries' },
  { bytes: 3 * GB, singular: 'complete Game Boy library', plural: 'complete Game Boy libraries' },

  // Vintage machines and shipped software, fixed forever
  { bytes: 64 * KB, singular: 'Commodore 64', plural: 'Commodore 64s' },
  { bytes: 16 * KB, singular: 'ZX Spectrum', plural: 'ZX Spectrums' },
  { bytes: 128 * KB, singular: 'original Macintosh', plural: 'original Macintoshes' },
  { bytes: 216 * KB, singular: 'copy of Macintosh System 1', plural: 'copies of Macintosh System 1' },
  { bytes: 72 * KB, singular: 'Apollo Guidance Computer', plural: 'Apollo Guidance Computers' },
  { bytes: 640 * KB, singular: 'MS-DOS memory limit', plural: 'MS-DOS memory limits' },
  { bytes: 1.8 * MB, singular: 'Windows 1.0 floppy set', plural: 'Windows 1.0 floppy sets' },
  { bytes: 10 * MB, singular: 'Windows 3.1 install', plural: 'Windows 3.1 installs' },
  { bytes: 1.44 * MB * 13, singular: 'Windows 95 floppy set', plural: 'Windows 95 floppy sets' },
  { bytes: 250 * KB, singular: 'copy of the Unix v6 source', plural: 'copies of the Unix v6 source' },
  { bytes: 1.2 * MB, singular: 'copy of the first Linux kernel', plural: 'copies of the first Linux kernel' },
  { bytes: 2.39 * MB, singular: 'copy of shareware Doom', plural: 'copies of shareware Doom' },
  { bytes: 200 * KB, singular: 'copy of Prince of Persia', plural: 'copies of Prince of Persia' },
  { bytes: 60 * KB, singular: 'Winamp skin', plural: 'Winamp skins' },
  { bytes: 5 * KB, singular: 'copy of the first web page', plural: 'copies of the first web page' },
  { bytes: 500 * KB, singular: 'copy of the Space Jam website', plural: 'copies of the Space Jam website' },
  { bytes: 30 * KB, singular: 'first digital photograph', plural: 'first digital photographs' },
  { bytes: 4 * KB, singular: 'polyphonic ringtone', plural: 'polyphonic ringtones' },

  // Audio, fixed by sample rate and bit depth
  { bytes: 176400, singular: 'second of CD audio', plural: 'seconds of CD audio' },
  { bytes: 10.6 * MB, singular: 'minute of CD audio', plural: 'minutes of CD audio' },
  { bytes: 635 * MB, singular: 'hour of CD audio', plural: 'hours of CD audio' },
  { bytes: 480 * KB, singular: 'minute of telephone audio', plural: 'minutes of telephone audio' },
  { bytes: 144 * MB, singular: 'hour of 320 kbps audio', plural: 'hours of 320 kbps audio' },
  { bytes: 3.5 * MB, singular: 'MP3 track', plural: 'MP3 tracks' },
  { bytes: 40 * MB, singular: 'lossless FLAC track', plural: 'lossless FLAC tracks' },
  { bytes: 500 * MB, singular: 'album in lossless audio', plural: 'albums in lossless audio' },

  // Video and imaging, fixed by format or by pixel arithmetic
  { bytes: 187 * MB, singular: 'minute of DV tape video', plural: 'minutes of DV tape video' },
  { bytes: 24.8 * MB, singular: 'uncompressed 4K frame', plural: 'uncompressed 4K frames' },
  { bytes: 99 * MB, singular: 'uncompressed 8K frame', plural: 'uncompressed 8K frames' },
  { bytes: 1.4 * GB, singular: 'DVD-quality movie', plural: 'DVD-quality movies' },
  { bytes: 225 * GB, singular: 'digital cinema package', plural: 'digital cinema packages' },
  { bytes: 8 * MB, singular: 'Hubble image', plural: 'Hubble images' },
  { bytes: 120 * MB, singular: 'Webb telescope image', plural: 'Webb telescope images' },
  { bytes: 500 * KB, singular: 'page scanned at 300 dpi', plural: 'pages scanned at 300 dpi' },
  { bytes: 50 * KB, singular: 'fax page', plural: 'fax pages' },

  // Science and protocol constants
  { bytes: 1.7 * MB, singular: 'day of Voyager 1 transmissions', plural: 'days of Voyager 1 transmissions' },
  { bytes: 750 * MB, singular: 'human genome', plural: 'human genomes' },
  { bytes: 128 * KB, singular: 'EIP-4844 blob', plural: 'EIP-4844 blobs' },
  { bytes: 17.2 * GB, singular: 'listing of every IPv4 address', plural: 'listings of every IPv4 address' },

  // Texts that will not be rewritten
  { bytes: 280, singular: 'tweet', plural: 'tweets' },
  { bytes: 160, singular: 'text message', plural: 'text messages' },
  { bytes: 4, singular: 'emoji', plural: 'emoji' },
  { bytes: 2 * KB, singular: 'plain-text email', plural: 'plain-text emails' },
  { bytes: 2 * KB, singular: 'page of typed text', plural: 'pages of typed text' },
  { bytes: 800 * KB, singular: 'novel as plain text', plural: 'novels as plain text' },
  { bytes: 1.2 * MB, singular: 'copy of Moby-Dick', plural: 'copies of Moby-Dick' },
  { bytes: 4.7 * MB, singular: 'copy of the Bible', plural: 'copies of the Bible' },
  { bytes: 5.3 * MB, singular: "copy of Shakespeare's complete works", plural: "copies of Shakespeare's complete works" },
  { bytes: 1.5 * MB, singular: 'copy of the Iliad and the Odyssey', plural: 'copies of the Iliad and the Odyssey' },
  { bytes: 45 * KB, singular: 'copy of the US Constitution', plural: 'copies of the US Constitution' },
  { bytes: 8 * KB, singular: 'copy of the Declaration of Independence', plural: 'copies of the Declaration of Independence' },
  { bytes: 1.5 * KB, singular: 'copy of the Gettysburg Address', plural: 'copies of the Gettysburg Address' },
  { bytes: 25 * KB, singular: 'copy of the Magna Carta', plural: 'copies of the Magna Carta' },
  { bytes: 3 * KB, singular: 'Rosetta Stone inscription', plural: 'Rosetta Stone inscriptions' },
  { bytes: 2 * MB, singular: 'copy of the Domesday Book', plural: 'copies of the Domesday Book' },
  { bytes: 300 * MB, singular: 'Encyclopaedia Britannica print set', plural: 'Encyclopaedia Britannica print sets' },
  { bytes: 540 * MB, singular: 'Oxford English Dictionary, second edition', plural: 'copies of the Oxford English Dictionary, second edition' },
  { bytes: 20 * MB, singular: 'phone book', plural: 'phone books' },
  { bytes: 200 * KB, singular: 'resume PDF', plural: 'resume PDFs' },
  { bytes: 50 * KB, singular: 'word processor document', plural: 'word processor documents' },
  { bytes: 3 * MB, singular: 'slide deck', plural: 'slide decks' },
  { bytes: 300 * KB, singular: 'tax return PDF', plural: 'tax return PDFs' },
];
