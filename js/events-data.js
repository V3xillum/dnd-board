/**
 * Event-pool + bordgeneratie
 *
 * EVENT_POOL  — voeg hier events toe (name, icon, ability, dc, category, flavor, successText, failText)
 * PATH_TILES  — rustige vakjes zonder D20-check
 *
 * Bij laden / "Nieuw avontuur" wordt buildSpecialSpaces() opnieuw gedraaid:
 * - ~38% rustige pad-vakjes (unieke tegels uit PATH_TILES, daarna opnieuw shufflen)
 * - rest D20-events, uniek per ronde zolang de pool groot genoeg is
 * - makkelijkere DC vroeg op het bord, zwaarder tegen het einde
 * - vak 56 = altijd kamp (rustig pad, terugtrekplek na boss-aanval)
 * - vak 62 = willekeurige eindbaas uit BOSS_POOL
 *
 * Zie js/EVENTS.md voor uitleg en voorbeelden.
 */
const PATH_TILES = [
  { name: 'Stille gang', icon: '🚶', flavor: 'Je stappen echoën door een lege gang. Even ademhalen — het pad gaat verder.' },
  { name: 'Oude vlaggen', icon: '🏴', flavor: 'Versleten banieren van vergeten koningen. Geen magie, geen val — alleen geschiedenis.' },
  { name: 'Kniklicht', icon: '🕯️', flavor: 'Kaarsen flakkeren in de tocht. Het licht houdt je gezelschap.' },
  { name: 'Stofwolk', icon: '💨', flavor: 'Een windvlaag waait door een open raam. Je knippert en loopt door.' },
  { name: 'Mossige muur', icon: '🌿', flavor: 'Groene mos op koude stenen. Het voelt bijna vredig.' },
  { name: 'Koperen bel', icon: '🔔', flavor: 'Een bel rinkelt ver weg. Niemand komt — jij loopt gewoon verder.' },
  { name: 'Gebarsten tegel', icon: '🧱', flavor: 'Oude tegels onder je laarzen. Niets gebeurt. Gelukkig.' },
  { name: 'Vleermuizen', icon: '🦇', flavor: 'Vleermuizen schieten voorbij. Ze hebben geen interesse in jou.' },
  { name: 'Verroeste kist', icon: '📦', flavor: 'Een lege kist langs het pad. Al lang geplunderd.' },
  { name: 'Maanlicht', icon: '🌙', flavor: 'Maanlicht door een scheur in het plafond. Even rust.' },
  { name: 'Kruidengeur', icon: '🌸', flavor: 'Lavendel en rozemarijn. Een herbergier heeft hier kruiden gedroogd.' },
  { name: 'Natte voetafdrukken', icon: '👣', flavor: 'Iemand was hier voor je — maar de sporen leiden vooruit, niet terug.' },
  { name: 'Gedraaide trap', icon: '🪜', flavor: 'Een trap naar beneden, maar jij blijft op het hoofdpad.' },
  { name: 'Vogelnest', icon: '🪺', flavor: 'Een nest in een hoek. De moeder kijkt je wantrouwig aan, maar laat je passeren.' },
  { name: 'Warme tocht', icon: '♨️', flavor: 'Warme lucht uit een spleet. Vulcanisch? Magisch? Vandaag niet jouw probleem.' },
];

/** Vast rustig vak — boss-retreat en even bijkomen vóór de volgende aanval */
const ENCAMPMENT_SPACE = 56;
const ENCAMPMENT_TILE = {
  name: 'Kamp bij de drempel',
  icon: '⛺',
  encampment: true,
  flavor:
    'Tenten, een smeulend vuur en stille wachters. Hier hergroept het gezelschap na elke aanval op de eindbaas — even op adem, dan weer de drempel op.',
};

const GUARDIAN_EVENT_NAME = 'Laatste wachter';
const PATH_RATIO = 0.38;

const EVENT_POOL = [
  { name: 'Valput', icon: '🕳️', ability: 'Acrobatics', dc: 10, category: 'trap',
    flavor: 'De vloer kraakt. Plots opent een put zich onder je voeten.',
    successText: 'Je springt over de opening met een salto die zelfs een bard zou bewonderen.',
    failText: 'Je schuift langs de rand en verliest tijd om weer op te krabbelen.' },
  { name: 'Pixie-kring', icon: '🧚', ability: 'Performance', dc: 9, category: 'fey',
    flavor: 'Pixies cirkelen om je hoofd. "Dans!" giechelen ze.',
    successText: 'Je danst. De Pixies juichen en duwen je een stap verder.',
    failText: 'Je struikelt. De Pixies fluiten je uit terwijl je in de modder landt.' },
  { name: 'Goblin-hinderlaag', icon: '👺', ability: 'Perception', dc: 10, category: 'combat',
    flavor: 'Pijlen fluiten uit het struikgewas. Goblins!',
    successText: 'Je ziet de touwtjes en ontwijkt de hinderlaag.',
    failText: 'Een pijl scheert langs je helm. Je deinst terug in paniek.' },
  { name: 'Mimic-kist', icon: '🗃️', ability: 'Investigation', dc: 11, category: 'trap',
    flavor: 'Een schatkist! Of... beweegt die deksel?',
    successText: 'Je tikt met je zwaard — het is geen mimic. Je loopt door!',
    failText: 'HAP! De kist bijt. Je moet even bijkomen.' },
  { name: 'Gelatinous Cube', icon: '🟢', ability: 'Dexterity', dc: 12, category: 'trap',
    flavor: 'Een trillende gele kubus blokkeert de gang.',
    successText: 'Je glijdt langs de cube alsof je op ijs danst.',
    failText: 'Je schoen blijft plakken. Uittrekken kost kostbare tijd.' },
  { name: 'Rustige herberg', icon: '🛏️', ability: 'Constitution', dc: 9, category: 'social',
    flavor: 'Stoofpot-geur en een warme haard. Te verleidelijk.',
    successText: 'Je neemt één slok en rent door — verkwikkend!',
    failText: 'Je valt bijna in slaap op een kruk. Je beurt is voorbij.' },
  { name: 'Zegel van Haste', icon: '⚡', ability: 'Arcana', dc: 11, category: 'magic',
    flavor: 'Een blauw zegel pulseert op de muur.',
    successText: 'De magie stroomt door je — je voelt je sneller!',
    failText: 'De rune ontploft in je gezicht. Sterretjes.' },
  { name: 'Instortende brug', icon: '🌉', ability: 'Athletics', dc: 12, category: 'trap',
    flavor: 'Een houten brug boven een kloof. Planken splinteren.',
    successText: 'Je sprint over de brug op het moment dat hij instort.',
    failText: 'De brug geeft mee. Je hangt even en verliest je momentum.' },
  { name: 'Magische runendeur', icon: '🔮', ability: 'Arcana', dc: 12, category: 'magic',
    flavor: 'Runen flikkeren op een massieve deur.',
    successText: 'De runen worden groen. De deur zucht open.',
    failText: 'Verkeerde rune! De deur lacht je uit.' },
  { name: 'Kobold-kamp', icon: '⚔️', ability: 'Combat', dc: 11, category: 'combat',
    flavor: 'Kobolds omringen je met roestige dolken.',
    successText: 'Je vecht je een weg door — de schat wacht!',
    failText: 'Te veel Kobolds. Je wijkt terug.' },
  { name: 'Illusie-trap', icon: '🪞', ability: 'Investigation', dc: 12, category: 'trap',
    flavor: 'De vloer lijkt te perfect. Alsof geschilderd.',
    successText: 'Je ziet de flikkering — de illusie verdwijnt.',
    failText: 'Je stapt in de illusie en raakt in de war.' },
  { name: 'Healing potion', icon: '🧪', ability: 'Medicine', dc: 9, category: 'loot',
    flavor: 'Een gloeiende fles. "Drink," fluistert een stem.',
    successText: 'De potion werkt! Je voelt je lichter op de benen.',
    failText: 'Verkeerde fles. Je maag draait.' },
  { name: 'Troll-wachter', icon: '🗣️', ability: 'Persuasion', dc: 13, category: 'social',
    flavor: 'Een Troll blokkeert de poort. "Grappig verhaal = passeren."',
    successText: 'De Troll brult van het lachen en laat je door.',
    failText: 'De Troll gromt. Je durft niet verder.' },
  { name: 'Betoverd woud', icon: '🌲', ability: 'Survival', dc: 11, category: 'wild',
    flavor: 'Bomen wiegen zonder wind. Paden verschuiven.',
    successText: 'Je volgt de mossige stenen als een lokken.',
    failText: 'Je verdwaalt even in de mist.' },
  { name: "Dragon's Lair", icon: '🐉', ability: 'Intimidation', dc: 14, category: 'combat',
    flavor: 'Een jonge draak spuwt een waarschuwingsvlam.',
    successText: 'Je houdt zijn blik. Hij knikt minzaam.',
    failText: 'De draak brult. Je hart bonkt te hard.' },
  { name: 'Oude kluis', icon: '🔍', ability: 'Investigation', dc: 12, category: 'mystery',
    flavor: 'Drie sloten, drie raadsels op zwart ijzer.',
    successText: 'Klik! De kluis onthult een shortcut-gevoel.',
    failText: 'Verkeerde combinatie. De kluis lacht.' },
  { name: 'Teleportatiecirkel', icon: '✨', ability: 'Arcana', dc: 13, category: 'magic',
    flavor: 'Runen branden op de vloer. Energie trilt.',
    successText: 'Je spreekt het woord. De magie duwt je vooruit!',
    failText: 'De cirkel flitst wild en laat je duizelig achter.' },
  { name: 'Vervallen altaar', icon: '⛪', ability: 'Religion', dc: 10, category: 'mystery',
    flavor: 'Donkere energie pulseert van een altaar.',
    successText: 'Je zegen werkt. Het altaar dempt.',
    failText: 'De vloek raakt je. Je bent even lam.' },
  { name: 'Gouden brug', icon: '🤸', ability: 'Acrobatics', dc: 13, category: 'trap',
    flavor: 'Smeltend goud onder je voeten. Heet!',
    successText: 'Je danst over het metaal als een acrobaat.',
    failText: 'Je glijdt. Je handen branden.' },
  { name: 'Zakkenroller', icon: '🎭', ability: 'Sleight of Hand', dc: 10, category: 'social',
    flavor: 'Iemand botst tegen je — te opzettelijk.',
    successText: 'Jij graait terug en vindt een verborgen route.',
    failText: 'Je portemonnee is lichter. Afgeleid.' },
  { name: 'Spookachtige kerkers', icon: '👻', ability: 'Religion', dc: 11, category: 'mystery',
    flavor: 'Koude adem op je nek. Fluisterende gebeden.',
    successText: 'Je zegen verdrijft de geesten.',
    failText: 'De geesten jagen je op. Paniek.' },
  { name: 'Vloek van pech', icon: '🎲', ability: 'Arcana', dc: 11, category: 'magic',
    flavor: 'Een zwevende dobbelsteen lacht.',
    successText: 'De vloek keert zich tegen de dobbelsteen zelf!',
    failText: 'Pech! Alles voelt zwaarder.' },
  { name: 'Beholder-droom', icon: '👁️', ability: 'Wisdom', dc: 14, category: 'mystery',
    flavor: 'Paarse mist. Ogen overal. Een droom?',
    successText: 'Je knijpt in je arm. De droom scheurt.',
    failText: 'De illusie houdt je vast.' },
  { name: 'Potion-roulette', icon: '🧫', ability: 'Medicine', dc: 10, category: 'loot',
    flavor: 'Zeven flessen. Eén helpt. De rest...',
    successText: 'Je kiest de juiste! Energie!',
    failText: 'Fout flesje. Je tong wordt blauw.' },
  { name: 'Bandiet-tol', icon: '💰', ability: 'Intimidation', dc: 11, category: 'social',
    flavor: '"Deze weg kost goud," grinniken bandieten.',
    successText: 'Je bluft over een draak achter je. Ze rennen.',
    failText: 'Ze lachen. Je verliest je zelfvertrouwen.' },
  { name: 'Geheime doorgang', icon: '🚪', ability: 'Investigation', dc: 11, category: 'mystery',
    flavor: 'De muur klinkt hol. Ergens een hendel.',
    successText: 'Klik! Een verborgen gang — je schiet door!',
    failText: 'Geen hendel. Alleen frustratie.' },
  { name: 'Lavavloer', icon: '🌋', ability: 'Acrobatics', dc: 12, category: 'trap',
    flavor: 'Tegels gloeien rood. Lava bubbelt.',
    successText: 'Parkour! Je springt van tegel tot tegel.',
    failText: 'Te heet! Je schoenen roken.' },
  { name: 'Mindflayer fluistering', icon: '🦑', ability: 'Arcana', dc: 14, category: 'mystery',
    flavor: 'Tentakels in je gedachten. "Geef op..."',
    successText: 'Mentale schild omhoog. De stem verstomt.',
    failText: 'Je hoofd bonkt. Even weg.' },
  { name: 'Owlbear-nest', icon: '🦉', ability: 'Animal Handling', dc: 12, category: 'wild',
    flavor: 'Mama Owlbear is niet blij.',
    successText: 'Je houdt een vis omhoog. Vrede.',
    failText: 'SKREE! Klauwen. Terugdeinzen.' },
  { name: 'Sirene-lied', icon: '🧜', ability: 'Performance', dc: 12, category: 'fey',
    flavor: 'Een melodie zo mooi dat het pijn doet.',
    successText: 'Je zingt een dissonant tegenlied.',
    failText: 'Hypnotiseerd. Je staart naar het water.' },
  { name: 'Zombie-horde', icon: '🧟', ability: 'Combat', dc: 11, category: 'combat',
    flavor: 'Grommen. Schuifelen. Overal.',
    successText: 'Headshot! De horde valt uiteen.',
    failText: 'Te veel. Je wijkt terug.' },
  { name: 'Zegening-fontein', icon: '⛲', ability: 'Religion', dc: 9, category: 'loot',
    flavor: 'Heldere water. Engelenbeeldje.',
    successText: 'Verkwikkend! De goden glimlachen.',
    failText: 'Het water was vervuild. Hoesten.' },
  { name: 'Gnomish uitvinding', icon: '⚙️', ability: 'Investigation', dc: 11, category: 'loot',
    flavor: 'Sprint-o-Matic 3000! (Niet getest.)',
    successText: 'BOEM — maar jij rent erop vooruit!',
    failText: 'Rook. Hoesten. Pech.' },
  { name: 'Schaduw-demon', icon: '🌑', ability: 'Intimidation', dc: 13, category: 'mystery',
    flavor: 'Je schaduw beweegt niet mee.',
    successText: '"Ik ben duisterder." De schaduw wijkt.',
    failText: 'De schaduw grijpt je. Angst.' },
  { name: 'Pit fiend-contract', icon: '📜', ability: 'Persuasion', dc: 15, category: 'social',
    flavor: 'Een duivel in een pak biedt een contract aan.',
    successText: 'Je onderhandelt als een advocaat.',
    failText: 'Kleine lettertjes. Duizelig.' },
  { name: GUARDIAN_EVENT_NAME, icon: '🛡️', ability: 'Combat', dc: 14, category: 'boss',
    flavor: 'De Laatste Wachter blokkeert de ingang tot de schat. Samen moeten jullie hem vellen!',
    successText: 'Een rake klap — de wachter wankelt!',
    failText: 'Zijn schild is te sterk. Je likt je wonden.' },
  { name: 'Oude rode draak', icon: '🐲', ability: 'Intimidation', dc: 15, category: 'boss',
    flavor: 'Vuur en zwavel. De draak van de schatkamer spuwt een waarschuwingsvlam.',
    successText: 'Je houdt zijn blik. Een schram op zijn schubben!',
    failText: 'De vlam raakt je. Terugdeinzen.' },
  { name: 'Stormreus', icon: '⛈️', ability: 'Athletics', dc: 14, category: 'boss',
    flavor: 'Donder op de drempel. Een reus blokkeert de poort met een rotsblok.',
    successText: 'Je ontwijkt zijn stamp en raakt een zwakke plek.',
    failText: 'De grond beeft. Je valt op je knieën.' },
  { name: 'Gevallen paladijn', icon: '⚔️', ability: 'Combat', dc: 13, category: 'boss',
    flavor: 'Eens een held, nu de laatste verdediger van de schat. Zijn ogen gloeien dof.',
    successText: 'Eerlijk duel — zijn harnas kraakt.',
    failText: 'Zijn zegen is nog niet vervlogen. Je wijkt terug.' },
  { name: 'Spiegeldubbelganger', icon: '🪞', ability: 'Insight', dc: 12, category: 'mystery',
    flavor: 'Je spiegelbeeld stapt uit het glas.',
    successText: 'Je omarmt je schaduw-zelf. Het smelt weg.',
    failText: 'Je dubbelganger wint. Desoriëntatie.' },
  { name: 'Etherische mist', icon: '🌫️', ability: 'Constitution', dc: 10, category: 'magic',
    flavor: 'Groene mist. Koperige smaak.',
    successText: 'Je rent door de damp heen.',
    failText: 'Hoofdpijn. Alles draait.' },
  { name: 'Goblin-gokspel', icon: '🎰', ability: 'Deception', dc: 10, category: 'social',
    flavor: 'Drie goblins met dobbelstenen. "Drie is company!"',
    successText: 'Je bluft met een lege zak. Ze geven je ruimte.',
    failText: 'Gefopt. Ze vieren.' },
  { name: 'Tijdwarp', icon: '⌛', ability: 'Arcana', dc: 14, category: 'magic',
    flavor: 'Je ziet jezelf drie seconden geleden én in de toekomst.',
    successText: 'Je synchroniseert. Vooruit!',
    failText: 'Paradox! Duizelig.' },
  { name: 'Vampier-tea', icon: '🧛', ability: 'Religion', dc: 12, category: 'social',
    flavor: '"Thee?" vraagt een edele figuur zonder spiegelbeeld.',
    successText: 'Je weigert beleefd. Hij knikt.',
    failText: 'Te gastvrij. Je verliest focus.' },
  { name: 'Kobold-inzicht', icon: '🦎', ability: 'Insight', dc: 9, category: 'social',
    flavor: 'Een Kobold biedt "hulp" aan. Zijn grijns is te breed.',
    successText: 'Je doorziet de truc en loopt door.',
    failText: 'Je vertrouwt hem. Fout.' },
    {
      name: 'Instortende brug',
      icon: '🌉',
      ability: 'Athletics',
      dc: 13,
      category: 'trap',
      flavor: 'De brug kraakt en zakt langzaam weg onder je gewicht.',
      successText: 'Je rent en springt precies op tijd naar de overkant.',
      failText: 'Je zakt door het hout en verliest kostbare tijd om jezelf los te trekken.',
    },

    {
      name: 'Gladde richel',
      icon: '🧗',
      ability: 'Acrobatics',
      dc: 12,
      category: 'trap',
      flavor: 'Een smalle richel langs een afgrond, nat en verraderlijk glad.',
      successText: 'Je beweegt sierlijk langs de wand zonder één misstap.',
      failText: 'Je glijdt uit en moet jezelf terugtrekken naar een veilig punt.',
    },

    {
      name: 'Zakkenroller in de menigte',
      icon: '🪙',
      ability: 'Sleight of Hand',
      dc: 12,
      category: 'social',
      flavor: 'Een drukke markt waar handen sneller bewegen dan ogen kunnen volgen.',
      successText: 'Je steelt iets waardevols zonder dat iemand het merkt.',
      failText: 'Iemand grijpt je pols net op het verkeerde moment.',
    },

    {
      name: 'Schaduwrijk pad',
      icon: '🌑',
      ability: 'Stealth',
      dc: 13,
      category: 'wild',
      flavor: 'Een patrouille beweegt in de verte terwijl jij door de struiken kruipt.',
      successText: 'Je passeert ongezien als een schaduw tussen de schaduwen.',
      failText: 'Een tak breekt onder je voet en je wordt opgemerkt.',
    },

    {
      name: 'Oude runensteen',
      icon: '🪨',
      ability: 'Arcana',
      dc: 14,
      category: 'magic',
      flavor: 'Een steen die zacht pulserende magie uitstraalt.',
      successText: 'Je ontcijfert de energie en benut een verborgen magisch pad.',
      failText: 'De runen reageren chaotisch en je voelt de magie tegenwerken.',
    },

    {
      name: 'Verzonken bibliotheek',
      icon: '📚',
      ability: 'History',
      dc: 13,
      category: 'mystery',
      flavor: 'Oude archieven half vergaan door tijd en water.',
      successText: 'Je vindt cruciale informatie over een verborgen route.',
      failText: 'Je raakt verdwaald in tegenstrijdige en misleidende teksten.',
    },

    {
      name: 'Verdachte sporen',
      icon: '🔍',
      ability: 'Investigation',
      dc: 12,
      category: 'mystery',
      flavor: 'Iemand is hier recent gepasseerd, maar waarom precies hier.',
      successText: 'Je volgt het juiste spoor en vermijdt een valstrik.',
      failText: 'Je volgt een vals spoor en verspilt kostbare tijd.',
    },

    {
      name: 'Giftige flora',
      icon: '🌿',
      ability: 'Nature',
      dc: 12,
      category: 'wild',
      flavor: 'Planten die zich vreemd gedragen, alsof ze je observeren.',
      successText: 'Je herkent de gevaarlijke planten en vindt veilig pad.',
      failText: 'Je raakt verstrikt in irriterende en schadelijke begroeiing.',
    },

    {
      name: 'Heilige ruïne',
      icon: '⛪',
      ability: 'Religion',
      dc: 13,
      category: 'magic',
      flavor: 'Een ingestorte tempel met nog zwakke goddelijke energie.',
      successText: 'Je ontvangt zegenende energie die je reis vergemakkelijkt.',
      failText: 'De energie keert zich tegen je en verstoort je focus.',
    },

    {
      name: 'Vreemde wilde beesten',
      icon: '🐺',
      ability: 'Animal Handling',
      dc: 12,
      category: 'wild',
      flavor: 'Dieren gedragen zich onnatuurlijk agressief.',
      successText: 'Je kalmeert de dieren en passeert veilig.',
      failText: 'De dieren raken in paniek en vallen je route aan.',
    },

    {
      name: 'Verborgen waarheid',
      icon: '🧠',
      ability: 'Insight',
      dc: 13,
      category: 'social',
      flavor: 'Een NPC lijkt niet helemaal eerlijk tegen je.',
      successText: 'Je doorziet de leugen en maakt de juiste keuze.',
      failText: 'Je vertrouwt de verkeerde signalen en wordt misleid.',
    },

    {
      name: 'Zieken reiziger',
      icon: '⚕️',
      ability: 'Medicine',
      dc: 12,
      category: 'social',
      flavor: 'Iemand ligt gewond langs het pad.',
      successText: 'Je stabiliseert de reiziger en wint zijn dankbaarheid.',
      failText: 'Je behandeling helpt niet en kost waardevolle tijd.',
    },

    {
      name: 'Verborgen hinderlaag',
      icon: '👁️',
      ability: 'Perception',
      dc: 13,
      category: 'trap',
      flavor: 'Iets klopt niet aan de stilte van deze plek.',
      successText: 'Je ziet de val net op tijd en ontwijkt hem.',
      failText: 'Je mist de val en loopt er vol in.',
    },

    {
      name: 'Onherbergzaam terrein',
      icon: '⛰️',
      ability: 'Survival',
      dc: 13,
      category: 'wild',
      flavor: 'De omgeving wordt steeds vijandiger en moeilijker te doorkruisen.',
      successText: 'Je vindt een veilige route door het ruige landschap.',
      failText: 'Je raakt gedesoriënteerd en verliest tijd.',
    },

    {
      name: 'Misleidende woorden',
      icon: '🎭',
      ability: 'Deception',
      dc: 12,
      category: 'social',
      flavor: 'Iemand stelt scherpe vragen die je beter kunt ontwijken.',
      successText: 'Je overtuigt hen met een geloofwaardig verhaal.',
      failText: 'Je verhaal valt uit elkaar en wekt wantrouwen.',
    },

    {
      name: 'Intimidatie duel',
      icon: '😠',
      ability: 'Intimidation',
      dc: 13,
      category: 'social',
      flavor: 'Een rivaliserende groep blokkeert je pad.',
      successText: 'Ze deinzen terug en laten je doorgaan.',
      failText: 'Ze worden juist agressiever en blokkeren je verder.',
    },

    {
      name: 'Straatoptreden',
      icon: '🎤',
      ability: 'Performance',
      dc: 12,
      category: 'social',
      flavor: 'Een groep verzamelt zich rond een onverwacht podium.',
      successText: 'Je optreden levert je hulp of gunsten op.',
      failText: 'De menigte verliest interesse en je gaat met lege handen verder.',
    },

    {
      name: 'Diplomatieke doorgang',
      icon: '🤝',
      ability: 'Persuasion',
      dc: 13,
      category: 'social',
      flavor: 'Een bewaker bepaalt of jij verder mag.',
      successText: 'Je overtuigt hen en krijgt vrije doorgang.',
      failText: 'Ze blijven twijfelen en houden je op.',
    },
    // ==========================
    // 🏛 HISTORY (6)
    // ==========================

    {
      name: 'Veldslag van de Vergeten Koning',
      icon: '⚔️',
      ability: 'History',
      dc: 13,
      category: 'mystery',
      flavor: 'De grond draagt nog echo’s van een oude oorlog.',
      successText: 'Je herkent de formatie en vindt een veilige doorgang door het slagveld.',
      failText: 'Je loopt in een oud “gevaarlijk zone” patroon en raakt gedesoriënteerd.',
    },

    {
      name: 'Gebroken kronieksteen',
      icon: '📜',
      ability: 'History',
      dc: 12,
      category: 'mystery',
      flavor: 'Fragmenten van een inscriptie vertellen een half verhaal.',
      successText: 'Je vult de ontbrekende stukken in en ontdekt een shortcut.',
      failText: 'Je interpreteert het verkeerd en neemt een omweg.',
    },

    {
      name: 'Oude handelsroute',
      icon: '🛤️',
      ability: 'History',
      dc: 11,
      category: 'mystery',
      flavor: 'Een vervallen weg die ooit belangrijk was.',
      successText: 'Je herkent de route en versnelt je reis.',
      failText: 'De route is misleidend en eindigt in ruïnes.',
    },

    {
      name: 'Naam in steen',
      icon: '🪦',
      ability: 'History',
      dc: 12,
      category: 'mystery',
      flavor: 'Een naam die ooit angst inboezemde.',
      successText: 'Je herkent de legende en vermijdt een gevaarlijke val.',
      failText: 'Je mist de waarschuwing en loopt risico.',
    },

    {
      name: 'Verloren koninkrijk',
      icon: '🏰',
      ability: 'History',
      dc: 14,
      category: 'mystery',
      flavor: 'Muren die niet zouden mogen bestaan.',
      successText: 'Je begrijpt de structuur en vindt een verborgen doorgang.',
      failText: 'Je raakt verdwaald in oude architectuur.',
    },

    {
      name: 'Oorlogsmonument',
      icon: '🗿',
      ability: 'History',
      dc: 11,
      category: 'mystery',
      flavor: 'Standbeelden kijken uit over een lege vlakte.',
      successText: 'Je leest de symbolen en kiest de juiste route.',
      failText: 'Je mist de betekenis en gaat verkeerd.',
    },

    // ==========================
    // 💪 ATHLETICS (5 extra)
    // ==========================

    {
      name: 'Vallende zuilen',
      icon: '🏛️',
      ability: 'Athletics',
      dc: 13,
      category: 'trap',
      flavor: 'Massieve stenen zuilen storten achter elkaar in.',
      successText: 'Je sprint er tussendoor zonder geraakt te worden.',
      failText: 'Een zuil raakt je schouder en vertraagt je.',
    },

    {
      name: 'Touwbrug zonder ankers',
      icon: '🪢',
      ability: 'Athletics',
      dc: 12,
      category: 'trap',
      flavor: 'De brug hangt los boven een diepe kloof.',
      successText: 'Je gebruikt momentum om veilig over te steken.',
      failText: 'Het touw scheurt en je bungelt gevaarlijk.',
    },

    {
      name: 'Stortende grot',
      icon: '🪨',
      ability: 'Athletics',
      dc: 13,
      category: 'trap',
      flavor: 'De tunnel stort langzaam in.',
      successText: 'Je duwt jezelf door een opening net op tijd.',
      failText: 'Rotsblokken blokkeren je pad.',
    },

    {
      name: 'Zware poort',
      icon: '🚪',
      ability: 'Athletics',
      dc: 12,
      category: 'trap',
      flavor: 'Een ijzeren poort blokkeert je weg.',
      successText: 'Met kracht duw je hem open.',
      failText: 'De poort geeft geen millimeter.',
    },

    {
      name: 'Zandvallei',
      icon: '🏜️',
      ability: 'Athletics',
      dc: 11,
      category: 'wild',
      flavor: 'Je zakt langzaam weg in het zand.',
      successText: 'Je beweegt efficiënt en blijft boven.',
      failText: 'Je raakt vast en verliest tijd.',
    },

    // ==========================
    // 🎭 SLEIGHT OF HAND (4)
    // ==========================

    {
      name: 'Valse sleutel',
      icon: '🗝️',
      ability: 'Sleight of Hand',
      dc: 12,
      category: 'trap',
      flavor: 'Een slot lijkt oud en fragiel.',
      successText: 'Je opent het zonder dat het mechanisme triggert.',
      failText: 'Een klik. Iets gaat mis.',
    },

    {
      name: 'Wisseltruc',
      icon: '🎩',
      ability: 'Sleight of Hand',
      dc: 11,
      category: 'social',
      flavor: 'Een bewaker controleert je spullen.',
      successText: 'Je wisselt iets subtiel zonder dat hij het merkt.',
      failText: 'Hij merkt dat er iets niet klopt.',
    },

    {
      name: 'Valstrik ontmanteling',
      icon: '🧨',
      ability: 'Sleight of Hand',
      dc: 13,
      category: 'trap',
      flavor: 'Draadjes en kleine mechanismes blokkeren de weg.',
      successText: 'Je haalt de val uit elkaar alsof het niets is.',
      failText: 'Je raakt een mechanisme en het activeert deels.',
    },

    {
      name: 'Verborgen zak',
      icon: '👝',
      ability: 'Sleight of Hand',
      dc: 10,
      category: 'loot',
      flavor: 'Een verdacht rustige handelaar.',
      successText: 'Je vindt een extra item zonder dat iemand het merkt.',
      failText: 'De handelaar merkt je poging.',
    },

    // ==========================
    // 🌿 SURVIVAL / NATURE (5)
    // ==========================

    {
      name: 'Verdwaald kompas',
      icon: '🧭',
      ability: 'Survival',
      dc: 12,
      category: 'wild',
      flavor: 'Je richtinggevoel klopt niet meer.',
      successText: 'Je herstelt je oriëntatie.',
      failText: 'Je loopt in cirkels.',
    },

    {
      name: 'Jachtsporen',
      icon: '🐾',
      ability: 'Survival',
      dc: 11,
      category: 'wild',
      flavor: 'Verse sporen in de modder.',
      successText: 'Je volgt een veilige route.',
      failText: 'Je volgt roofdieren.',
    },

    {
      name: 'Giftige mist',
      icon: '🌫️',
      ability: 'Survival',
      dc: 13,
      category: 'wild',
      flavor: 'De lucht wordt dik en zwaar.',
      successText: 'Je vindt een veilige luchtstroom.',
      failText: 'Je raakt verzwakt door de damp.',
    },

    {
      name: 'Eetbare flora',
      icon: '🍃',
      ability: 'Nature',
      dc: 10,
      category: 'loot',
      flavor: 'Planten met onbekende eigenschappen.',
      successText: 'Je vindt veilige voeding.',
      failText: 'Je kiest verkeerd en wordt ziek.',
    },

    {
      name: 'Natuurlijke val',
      icon: '🪤',
      ability: 'Nature',
      dc: 12,
      category: 'trap',
      flavor: 'De natuur zelf vormt een val.',
      successText: 'Je herkent het patroon en ontwijkt het.',
      failText: 'Je stapt erin zonder het te merken.',
    },

    // ==========================
    // 👁️ PERCEPTION / INSIGHT (4)
    // ==========================

    {
      name: 'Onzichtbare doorgang',
      icon: '🫥',
      ability: 'Perception',
      dc: 12,
      category: 'mystery',
      flavor: 'Iets klopt niet aan de muur.',
      successText: 'Je ziet de opening.',
      failText: 'Je mist het volledig.',
    },

    {
      name: 'Liegende gids',
      icon: '🧍',
      ability: 'Insight',
      dc: 12,
      category: 'social',
      flavor: 'Iemand wijst je de weg.',
      successText: 'Je doorziet zijn intentie.',
      failText: 'Je volgt slecht advies.',
    },

    {
      name: 'Verborgen bedreiging',
      icon: '👁️',
      ability: 'Perception',
      dc: 13,
      category: 'trap',
      flavor: 'Iets kijkt naar jou.',
      successText: 'Je reageert op tijd.',
      failText: 'Te laat.',
    },

    {
      name: 'Echte vijand',
      icon: '🧠',
      ability: 'Insight',
      dc: 13,
      category: 'social',
      flavor: 'Wie is echt gevaarlijk hier?',
      successText: 'Je kiest correct.',
      failText: 'Verkeerde inschatting.',
    },

    // ==========================
    // 🔀 CHOICE EVENTS (6)
    // ==========================

    {
      name: 'Drie paden',
      icon: '🛣️',
      ability: 'Survival',
      dc: 0,
      category: 'mystery',
      flavor: 'Links snel maar gevaarlijk, rechts veilig maar traag, midden onbekend.',
      successText: 'Je keuze pakt goed uit.',
      failText: 'Je keuze was suboptimaal.',
    },

    {
      name: 'Gevangen deur',
      icon: '🚪',
      ability: 'Athletics OR Sleight of Hand',
      dc: 12,
      category: 'trap',
      flavor: 'De deur kan geforceerd of ontgrendeld worden.',
      successText: 'Je vindt een manier naar binnen.',
      failText: 'De deur blijft dicht.',
    },

    {
      name: 'Onderhandeling',
      icon: '🤝',
      ability: 'Persuasion OR Intimidation',
      dc: 12,
      category: 'social',
      flavor: 'Twee manieren om hetzelfde doel te bereiken.',
      successText: 'Je krijgt doorgang.',
      failText: 'Je wordt geweigerd.',
    },

    {
      name: 'Val of beloning',
      icon: '🎲',
      ability: 'Perception OR Investigation',
      dc: 12,
      category: 'loot',
      flavor: 'Iets ligt voor je. Veilig of gevaarlijk?',
      successText: 'Je kiest slim.',
      failText: 'Je kiest verkeerd.',
    },

    {
      name: 'Risico sprint',
      icon: '🏃',
      ability: 'Athletics OR Acrobatics',
      dc: 13,
      category: 'trap',
      flavor: 'Snel of gecontroleerd bewegen door gevaar.',
      successText: 'Je komt er doorheen.',
      failText: 'Je raakt vertraagd.',
    },

    {
      name: 'Mystieke keuze',
      icon: '🔮',
      ability: 'Arcana OR Religion',
      dc: 13,
      category: 'magic',
      flavor: 'Magie of geloof, beide kunnen werken.',
      successText: 'De energie buigt mee.',
      failText: 'Het werkt niet zoals verwacht.',
    },
];

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createDeck(source) {
  let deck = shuffleArray(source);
  return {
    draw() {
      if (deck.length === 0) deck = shuffleArray(source);
      return deck.pop();
    },
  };
}

const BOSS_POOL = EVENT_POOL.filter((e) => e.category === 'boss');

function getDefaultBoss() {
  return EVENT_POOL.find((e) => e.name === GUARDIAN_EVENT_NAME) || BOSS_POOL[0] || EVENT_POOL[0];
}

function pickRandomBoss() {
  if (BOSS_POOL.length === 0) return getDefaultBoss();
  return BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)];
}

function eventsExceptBosses() {
  return EVENT_POOL.filter((e) => e.category !== 'boss');
}

function eventsByDc(min, max) {
  return eventsExceptBosses().filter((e) => e.dc >= min && e.dc <= max);
}

/** Vak 2–61 (excl. 62): shuffle, ~38% pad, rest events met DC-progressie */
function buildSpecialSpaces() {
  const spaces = {
    1: {
      type: 'start',
      name: 'De Taverne',
      icon: '🍺',
      flavor: 'Warme haard, rum en verhalen. Hier begint elk avontuur.',
    },
    63: {
      type: 'finish',
      name: 'Draken-schat',
      icon: '💰',
      flavor: 'Goud, edelstenen, artefacten. De schat van legende ligt voor je!',
    },
  };

  const bossPreview = pickRandomBoss();
  spaces[62] = { type: 'event', ...bossPreview };
  spaces[ENCAMPMENT_SPACE] = { type: 'path', ...ENCAMPMENT_TILE };

  const playable = [];
  for (let n = 2; n <= 61; n += 1) {
    if (n !== ENCAMPMENT_SPACE) playable.push(n);
  }

  const shuffledSlots = shuffleArray(playable);
  const pathCount = Math.round(shuffledSlots.length * PATH_RATIO);
  const pathSlots = shuffledSlots.slice(0, pathCount);
  const eventSlots = shuffledSlots.slice(pathCount);

  const pathDeck = createDeck(PATH_TILES);
  pathSlots.forEach((slot) => {
    const tile = pathDeck.draw();
    spaces[slot] = { type: 'path', ...tile };
  });

  const earlySlots = shuffleArray(eventSlots.filter((n) => n <= 21));
  const midSlots = shuffleArray(eventSlots.filter((n) => n > 21 && n <= 42));
  const lateSlots = shuffleArray(eventSlots.filter((n) => n > 42));

  const easyDeck = createDeck(eventsByDc(0, 10));
  const midDeck = createDeck(eventsByDc(11, 12));
  const hardDeck = createDeck(eventsByDc(13, 99));

  function assignEvents(slots, deck) {
    slots.forEach((slot) => {
      const ev = deck.draw();
      spaces[slot] = { type: 'event', ...ev };
    });
  }

  assignEvents(earlySlots, easyDeck);
  assignEvents(midSlots, midDeck);
  assignEvents(lateSlots, hardDeck);

  return spaces;
}

let SPECIAL_SPACES = buildSpecialSpaces();

function rebuildBoard() {
  SPECIAL_SPACES = buildSpecialSpaces();
  window.SPECIAL_SPACES = SPECIAL_SPACES;
  return SPECIAL_SPACES;
}

window.SPECIAL_SPACES = SPECIAL_SPACES;
window.EVENT_POOL = EVENT_POOL;
window.BOSS_POOL = BOSS_POOL;
window.PATH_TILES = PATH_TILES;
window.ENCAMPMENT_SPACE = ENCAMPMENT_SPACE;
window.ENCAMPMENT_TILE = ENCAMPMENT_TILE;
window.getDefaultBoss = getDefaultBoss;
window.pickRandomBoss = pickRandomBoss;
window.rebuildBoard = rebuildBoard;
window.buildSpecialSpaces = buildSpecialSpaces;
