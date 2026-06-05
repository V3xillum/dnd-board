/**
 * Event-pool + bordgeneratie
 *
 * EVENT_POOL_RAW — geneste pool: category → ability → events (name, icon, dc, flavor, …)
 * flattenEventPool() zet dit om naar platte EVENT_POOL voor de engine
 * PATH_TILES     — rustige vakjes zonder D20-check
 *
 * Bij laden / "Nieuw avontuur" wordt buildSpecialSpaces() opnieuw gedraaid:
 * - ~38% rustige pad-vakjes (unieke tegels uit PATH_TILES, daarna opnieuw shufflen)
 * - rest D20-events, uniek per ronde zolang de pool groot genoeg is
 * - makkelijkere DC vroeg op het bord, zwaarder tegen het einde
 * - vak 56 = genezerhutje (volledig HP-herstel)
 * - vak 62 = willekeurige eindbaas uit BOSS_POOL
 *
 * Zie js/EVENTS.md voor uitleg en voorbeelden.
 */
const PATH_TILES = [
  { name: 'Stille gang', icon: '🚶', flavor: 'Je voetstappen echoën door een verlaten gang — elk geluid een eenzame echo in de drukkende stilte. Geen val, geen bedreiging, alleen steen en de kalme zekerheid dat het pad doorgaat.' },
  { name: 'Oude vlaggen', icon: '🏴', flavor: 'Versleten banieren hangen slap aan roestige spijkers — heraldiek van koninkrijken die al eeuwen vergeten zijn. Geen magie, geen val, alleen de stille echo van lang vervlogen glorie.' },
  { name: 'Kniklicht', icon: '🕯️', flavor: 'Een rij kandelaars langs de wand flakkert in een trekwind die je niet kunt verklaren, de vlammen dansend alsof ze je begroeten. Het zachte licht houdt je gezelschap in de duisternis.' },
  { name: 'Stofwolk', icon: '💨', flavor: 'Een windvlaag jaagt vanuit een halfopen venster en blaast een dikke stofwolk je tegemoet. Wanneer de lucht opklaart is er niets — alleen wind en oud stof.' },
  { name: 'Mossige muur', icon: '🌿', flavor: 'Dikke lagen mos bedekken de koude stenen tot op schouderhoogte, zacht en bijna warm onder je vingers. De natuur claimt langzaam terug wat ooit van mensen was.' },
  { name: 'Koperen bel', icon: '🔔', flavor: 'Ergens diep in de gang rinkelt een koperen bel — helder, eenzaam en volkomen onverwacht. Er komen geen voetstappen; het geluid sterft weg zonder antwoord.' },
  { name: 'Gebarsten tegel', icon: '🧱', flavor: 'Oude vloertegels, veel ervan gebroken door eeuwen van verzakking, klinken hol onder je laarzen. Niets geeft mee, niets beweegt — gewoon een oud vloer op een oud pad.' },
  { name: 'Vleermuizen', icon: '🦇', flavor: 'Een zwerm vleermuizen explodeert van het plafond in een plotselinge stormvloed van ritselen vleugels. Ze spiralen om je hoofd en zijn dan weg — ze hadden geen interesse in jou.' },
  { name: 'Verroeste kist', icon: '📦', flavor: 'Een houten kist staat scheef tegen de wand, het hout rot en het slot oranje van roest. Je tikt met je laarsteen — hol, leeg, al lang geplunderd door iemand die sneller was.' },
  { name: 'Maanlicht', icon: '🌙', flavor: 'Een scheur in het gewelf laat een straal helder maanlicht binnen, zilverachtig en onverwacht mooi in de sombere gang. Je staat even stil in dat licht — hier is het bijna veilig.' },
  { name: 'Kruidengeur', icon: '🌸', flavor: 'De lucht draagt plotseling de geur van lavendel en rozemarijn, droge kruiden hangend aan een haak in de wand. Wie het hier droogde is al lang weg, maar hun geur blijft hangen als een vriendelijke geest.' },
  { name: 'Natte voetafdrukken', icon: '👣', flavor: 'Vochtige voetafdrukken in het stof — vers, niet meer dan een uur oud. Ze lopen vooruit, niet terug; twee reizigers op hetzelfde pad die elkaar nooit zullen ontmoeten.' },
  { name: 'Gedraaide trap', icon: '🪜', flavor: 'Een smalle wenteltrap daalt af naar diepere gewelven, omgeven door kaarsarmpjes en onbekende beloftes. Jouw doel ligt niet naar beneden — nu recht vooruit, de trap links latend.' },
  { name: 'Vogelnest', icon: '🪺', flavor: 'In een hoek herbergt een rommelig vogelnest met zorgvuldig gerangschikte eitjes. De moeder staart je aan met kleine kralenogen, paraat maar wachtend. Je passeert zo breed mogelijk — ze laat je door.' },
  { name: 'Warme tocht', icon: '♨️', flavor: 'Een aangenaam warme luchtstroom welt op uit een spleet in de vloer, verrassend in de koele gang. Vulcanisch, magisch of gnomisch vakmanschap — vandaag maakt het niet uit. Je geniet even en loopt verder.' },
  { name: 'Rode ader', icon: '🌱', flavor: 'Tussen gezond mos loopt een enkele rode ader door de grond. Niet dikker dan een touwtje. Hij pulseert één keer terwijl je kijkt, en blijft daarna stil alsof er nooit iets was.' },
  { name: 'Wolvengehuil', icon: '🐺', flavor: 'In de verte klinkt een enkele wolvenroep. Geen dreiging. Geen antwoord. Alleen een eenzame stem ergens diep in het woud.' },
  { name: 'Vergeten kring', icon: '🪨', flavor: 'Een oude cirkel van stenen ligt verborgen tussen varens en wortels. Het mos erop is onaangeroerd. Wat hier ooit gebeurde, is al lang voorbij.' },
  { name: 'Zwarte veer', icon: '🪶', flavor: 'Een enkele zwarte veer rust op een boomstronk. Onbeschadigd. Alsof iemand hem daar bewust heeft achtergelaten.' },
  { name: 'Helder water', icon: '💧', flavor: 'Een smalle bron stroomt tussen stenen door. Het water is ijskoud en verrassend helder. Zelfs het bos lijkt hier even rustiger te ademen.' },
  { name: 'Oude wortels', icon: '🌳', flavor: 'Een enorme wortel steekt boven de grond uit en vormt bijna vanzelf een bankje. De boom zelf moet ouder zijn dan de meeste koninkrijken.' },
  { name: 'Dansend stuifmeel', icon: '✨', flavor: 'Gouden stuifmeel dwarrelt tussen de zonnestralen door. Heel even lijkt het alsof de lucht zelf licht geeft.' },
  { name: 'Gebroken altaar', icon: '🪦', flavor: 'De resten van een oud stenen altaar liggen verspreid tussen de struiken. Geen symbolen zijn nog leesbaar. Alleen tijd heeft hier gewonnen.' },
  { name: 'Verwaaide pagina', icon: '📜', flavor: 'Een enkele pagina ligt vastgeklemd onder een steen. De inkt is vervaagd tot onleesbare vlekken, maar iemand heeft ooit moeite gedaan deze woorden op te schrijven.' },
  { name: 'Paddenstoelencirkel', icon: '🍄', flavor: 'Een perfecte ring van kleine paddenstoelen groeit rond een jonge berk. Zelfs de vogels lijken deze plek te vermijden.' },
  { name: 'Groene stilte', icon: '🌿', flavor: 'Plotseling valt alle wind weg. Geen bladeren bewegen. Geen vogels zingen. Het bos kijkt alleen maar toe.' },
  { name: 'Hertenspoor', icon: '🦌', flavor: 'Verse hoefafdrukken kruisen het pad. Ze verdwijnen tussen de bomen zonder haast, alsof hun eigenaar zich nergens zorgen over hoeft te maken.' },
  { name: 'Ochtendmist', icon: '🌫️', flavor: 'Lage mist hangt tussen de stammen. Zonlicht breekt in lange banen door het wit. Voor een moment lijkt het bos oneindig groot.' },
  { name: 'Rustplaats', icon: '🪵', flavor: 'Een omgevallen boom vormt een natuurlijke zitplaats. Iemand heeft hier ooit gezeten, gegeten en weer verder gereisd.' },
  { name: 'Verre klokken', icon: '🔔 ', flavor: 'Heel in de verte hoor je een enkele klok luiden. Te ver weg om te plaatsen. Het geluid draagt verrassend lang door het woud.' },
  { name: 'Hartslag onder de aarde', icon: '❤️', flavor: 'Wanneer je even stilstaat, denk je iets te voelen onder je voeten. Niet een trilling. Niet een aardbeving. Meer alsof de grond zelf één langzame hartslag geeft voordat alles weer stil wordt.' },
];

/** Vast genezer-vak op het bord */
const HEALER_SPACE = 56;
const HEALER_TILE = {
  name: 'Genezerhutje',
  icon: '✨',
  flavor:
    'Een bescheiden hutje rookt zacht naar de drempel toe. Een cleric zwaait je binnen, legt warme handen op je wonden en fluistert een gebed — je voelt je weer volledig hersteld.',
};
/** @deprecated alias — gebruik HEALER_SPACE */
const ENCAMPMENT_SPACE = HEALER_SPACE;
/** @deprecated alias — gebruik HEALER_TILE */
const ENCAMPMENT_TILE = HEALER_TILE;

const GUARDIAN_EVENT_NAME = 'Laatste wachter';
const PATH_RATIO = 0.38;
/** ~8% van event-slots wordt ambush-put; tune 0.05 subtieler, 0.12 gevaarlijker */
const AMBUSH_RATIO = 0.08;

/** Zet geneste pool (category → ability → events) om naar platte array voor de engine. */
function flattenEventPool(nested) {
  const flat = [];
  for (const [category, byAbility] of Object.entries(nested)) {
    for (const [ability, events] of Object.entries(byAbility)) {
      for (const ev of events) {
        flat.push({ ...ev, category, ability });
      }
    }
  }
  return flat;
}

function attackBonusFromDc(dc) {
  if (dc <= 11) return 3;
  if (dc <= 14) return 4;
  return 5;
}

const BOSS_SPECIAL_ATTACKS = {
  'Storm Giant': { name: 'Thunder Stomp', saveAbility: 'Dexterity', dc: 14, dmgFail: 2, dmgSuccess: 1 },
  'Hill Giant': { name: 'Boulder Toss', saveAbility: 'Dexterity', dc: 13, dmgFail: 2, dmgSuccess: 1 },
  [GUARDIAN_EVENT_NAME]: { name: 'Shield Slam', saveAbility: 'Athletics', dc: 14, dmgFail: 2, dmgSuccess: 1 },
  'Dark Paladin': { name: 'Fallen Smite', saveAbility: 'Constitution', dc: 14, dmgFail: 2, dmgSuccess: 1 },
  Dracolich: { name: 'Lich Breath', saveAbility: 'Constitution', dc: 16, dmgFail: 2, dmgSuccess: 1 },
  'Ancient Red Dragon': { name: 'Fire Breath', saveAbility: 'Dexterity', dc: 15, dmgFail: 2, dmgSuccess: 1 },
  'Ancient Black Dragon': { name: 'Acid Breath', saveAbility: 'Dexterity', dc: 16, dmgFail: 2, dmgSuccess: 1 },
  'Avatar of the Blight': { name: 'Blight Spores', saveAbility: 'Constitution', dc: 15, dmgFail: 2, dmgSuccess: 1 },
  Reaper: { name: 'Soul Drain', saveAbility: 'Wisdom', dc: 15, dmgFail: 2, dmgSuccess: 1 },
  Lich: { name: 'Finger of Death', saveAbility: 'Constitution', dc: 15, dmgFail: 2, dmgSuccess: 1 },
  'Death Knight': { name: 'Hellfire Blade', saveAbility: 'Dexterity', dc: 14, dmgFail: 2, dmgSuccess: 1 },
  'Green Hag': { name: "Hag's Curse", saveAbility: 'Wisdom', dc: 14, dmgFail: 2, dmgSuccess: 1 },
};

function defaultBossSpecialAttack(ev) {
  const dc = ev.dc ?? 14;
  return {
    name: 'Special Attack',
    saveAbility: 'Dexterity',
    dc: Math.max(12, dc - 1),
    dmgFail: 2,
    dmgSuccess: 1,
  };
}

/** Voeg attack-roll velden toe aan ambush/boss entries (sessie 10). */
function enrichCombatEvent(ev) {
  if (ev.category !== 'ambush' && ev.category !== 'boss') return ev;
  const dc = ev.dc ?? 10;
  const heavyDmg = ev.name === 'Orc Patrol'
    || ev.name === 'Ancient Red Dragon'
    || ev.name === 'Ancient Black Dragon'
    || ev.name === 'Dracolich';
  const enriched = {
    ...ev,
    attackBonus: ev.attackBonus ?? attackBonusFromDc(dc),
    dmg: ev.dmg ?? (heavyDmg ? 2 : 1),
  };
  if (ev.category === 'boss') {
    enriched.specialAttack = ev.specialAttack
      ?? BOSS_SPECIAL_ATTACKS[ev.name]
      ?? defaultBossSpecialAttack(ev);
  }
  return enriched;
}

const EVENT_POOL_RAW = {
  ambush: {
    "Acrobatics": [
      {
        name: "Cave Spider",
        icon: "🕷️",
        dc: 10,
        ambushHp: 3,
        flavor: "Glinsterende draden beslaan de volledige gangbreedte. In het donker daarboven beweegt iets groot, achtpotig, met acht smaragdgroene ogen.",
        successText: "Je snijdt je weg door de draden in gerichte banen en raakt de spin met een rake klap die haar terugstuwt naar het donker.",
        failText: "De kleverige draden grijpen je enkels en polsen. De spin nadert onverstoorbaar en een bijtende pijn schiet door je been.",
      },
    ],
    "Animal Handling": [
      {
        name: "Shadow Wolf",
        icon: "🐺",
        dc: 9,
        ambushHp: 2,
        flavor: "Gele ogen in de mist, dan een sprong — een wolf half gemaakt van schaduw en half van tand en klauw. Je moet vechten om vrij te komen.",
        successText: "Je draait mee met zijn sprong en duwt hem langs je heen. Hij landt verward op een lege plek. Jij staat er al niet meer.",
        failText: "Klauwen sluiten om je mantel. De wolf houdt je vast met zijn gewicht, zijn gromt warm in je oor.",
      },
    ],
    "Athletics": [
      {
        name: "Orc Explorer",
        icon: "👁️",
        dc: 9,
        ambushHp: 2,
        flavor: "Hij was al voor jou hier. Snel, stil voor een ork, en klaar voor bloed.",
        successText: "Je ontwapent hem voor hij kan schreeuwen.",
        failText: "Zijn vuist raakt je hard — je verliest het initiatief.",
      },
    ],
    "Combat": [
      {
        name: "Orc Patrol",
        icon: "⚔️",
        dc: 11,
        ambushHp: 4,
        flavor: "Drie orcs in zwaar harnas, schilden aaneengekoppeld in een professionele schildmuur. Dit zijn getrainde soldaten, geen straatschuim.",
        successText: "Je richt je op de minst gebalanceerde in de formatie. Hij wankelt, de muur scheurt en je schiet door de bres.",
        failText: "Hun schildmuur houdt stand als een muur van ijzer en vlees. Je draagt de pijnlijke schade van de terugslag.",
      },
    ],
    "Constitution": [
      {
        name: "Banshee",
        icon: "😱",
        dc: 11,
        ambushHp: 2,
        flavor: "Een witte gestalte zweeft boven de graven. Ze haalt adem — en de wereld wacht op de kreet.",
        successText: "Je propt was in je oren en rent door de echo voordat je botten bevriezen.",
        failText: "De kreet raakt je merg. Je benen weigeren een volle minuut lang.",
      },
    ],
    "Insight": [
      {
        name: "Assasin",
        icon: "🗡️",
        dc: 10,
        ambushHp: 3,
        flavor: "Een kap uit de schaduw — dan nog een, dan nog een. Getrainde moordenaars omsingelen je zonder haast, want ze weten dat jij nergens naartoe kunt.",
        successText: "Je leest de gewichtsverschuiving van de leider een microseconde te vroeg, parreert en dwingt hem terug. De cirkel wankelt.",
        failText: "Een mes scheert langs je ribben. Je bloedt, je zit vast, en elke uitweg is zorgvuldig afgesneden door mensen die dit voor hun inkomen doen.",
      },
    ],
    "Intimidation": [
      {
        name: "Bandits",
        icon: "💰",
        dc: 11,
        ambushHp: 3,
        flavor: "De vloer verdwijnt met een precisie-klik. Je valt een meter — en als je kijkt staan bandieten langs de rand boven je, grijnzend neer.",
        successText: "Je blokt de eerste arm en gebruikt hem als katapult omhoog. Een bandiet wankelt achterover en de anderen deinzen verrast terug.",
        failText: "Ze raken je hard met de kolf van een bijlsteel. Je zit in hun kuil, hun lachen echoot van de wanden.",
      },
    ],
    "Perception": [
      {
        name: "Goblin in de struiken",
        icon: "👺",
        dc: 9,
        ambushHp: 2,
        flavor: "Pijlen fluiten vanuit beide kanten van het pad — goblins, tenminste vier, in perfecte hinderlaagposities. Je zit vast in hun val en er is geen makkelijke uitweg.",
        successText: "Je leest de hoek van de tweede pijl, gooit jezelf achter een rots en richt een tegenaanval. De formatie valt uiteen.",
        failText: "De eerste pijl raakt je schouder met genoeg kracht om je te doen struikelen. De goblins lachen zelfvoldaan vanuit hun schuilplaatsen.",
      },
    ],
    "Religion": [
      {
        name: "Revenant",
        icon: "⚰️",
        dc: 11,
        ambushHp: 3,
        flavor: "Hij is dood. Hij weet het. En hij geeft er niets om.",
        successText: "Je spreekt de last van zijn eed uit zijn botten.",
        failText: "Hij grijpt je keel met koude vingers.",
      },
    ],
    "Stealth": [
      {
        name: "Blight-jager",
        icon: "🐺",
        dc: 12,
        ambushHp: 3,
        flavor: "Een corrupte wolf volgt je al uren. Je ziet hem pas wanneer hij besluit gezien te worden.",
        successText: "Je draait de jacht om voordat hij kan toeslaan.",
        failText: "Hij springt vanuit het struikgewas.",
      },
      {
        name: "Flayer-verkenner",
        icon: "🧠",
        dc: 12,
        ambushHp: 2,
        flavor: "Een rat kijkt je net iets te intelligent aan.",
        successText: "Je ontdekt de verkenner voordat hij zijn rapport kan sturen.",
        failText: "Hij piept eenmaal. Er luistert iemand mee.",
      },
    ],
  },
  boss: {
    "Athletics": [
      {
        name: "Storm Giant",
        icon: "⛈️",
        dc: 14,
        flavor: "Donder van voetstappen. Twaalf voet, breed geplant, een rotsblok in elke hand groot als een paard. Hij kijkt naar beneden — naar jou.",
        successText: "Je leest de stamprichting in zijn dijspieren een halve seconde te vroeg. Je schiet opzij en raakt zijn enkel — zijn zwakste punt.",
        failText: "De schokgolf van zijn stamp gooit je van je benen. Je knieën landen hard op koud steen en opstaan duurt te lang.",
      },
      {
        name: "Hill Giant",
        icon: "🪨",
        dc: 13,
        flavor: "Hij is niet slim, maar hij is groot, hongerig en heeft een boomstam die hij als knuppel gebruikt. Hij ruikt je voor hij je ziet.",
        successText: "Je lokt hem in zijn eigen zwaai — hij mist, struikelt, en jij bent er al voor hij overeind is.",
        failText: "De boomstam raakt je schouder met genoeg kracht om je te doen denken dat het gebroken is. Het is niet gebroken. Het voelt wel zo.",
      },
    ],
    "Combat": [
      {
        name: GUARDIAN_EVENT_NAME,
        icon: "🛡️",
        dc: 14,
        flavor: "Aan het einde van de gang staat een figuur in perfect gepolijst harnas, zwaard getrokken, houding onberispelijk. Hij wist dat jullie zouden komen. Hij heeft gewacht.",
        successText: "Samengewerkt — een klap landt op het kwetsbare kniepunt van zijn harnas. De Wachter wankelt, zijn perfecte houding gebroken voor de eerste keer.",
        failText: "Zijn schild voorspelt elke aanval. Je hebt geraakt, maar hij heeft harder geraakt. Likt je wonden, bereidt de volgende aanval voor.",
      },
      {
        name: "Dark Paladin",
        icon: "⚔️",
        dc: 13,
        flavor: "Eens beschermde hij deze plek voor de goede goden. Nu zijn zijn ogen leeg en koud — goddelijk licht dat is omgekeerd. Hij herkent jullie en het maakt hem woester.",
        successText: "Een eerlijk duel. Je haalt zijn schild weg met een klassieke ontwijkmaneuver en zijn harnas kraakt onder de volgende slag.",
        failText: "Zijn gevallen zegen brandt nog in zijn slagen. Ze treffen je met een heilig vuur dat je doet wijken.",
      },
      {
        name: "Dracolich",
        icon: "💀",
        dc: 16,
        flavor: "Een draak die de lich-rite onderging. Zijn vlees is weg, zijn schubben zijn los en zijn ogen zijn lege paarse vlammen. Hij vliegt geluidloos — botten maken geen wind.",
        successText: "Je treft zijn schedel op de exacte plek waar zijn phylactery verborgen zit. De vlammen flikkeren. Hij gilt voor het eerst in honderd jaar.",
        failText: "Zijn lich-adem is geen vuur — het is veroudering. Je voelt je spieren stijver worden dan een seconde geleden.",
      },
    ],
    "Intimidation": [
      {
        name: "Ancient Red Dragon",
        icon: "🐲",
        dc: 15,
        flavor: "De schatkamer ademt — de berg goud heeft schubben. De draak is groot, oud en buitengewoon zat van helden die denken dat ze een kans maken.",
        successText: "Je houdt zijn blik door drie lange ademhalingen. Een schram op zijn nekschilden — hij honoreert de moed van een klein wezen.",
        failText: "De waarschuwingsvlam raakt je in een golf van hitte. Je vest smelt gedeeltelijk en je terugwijken is minder heroïsch dan gepland.",
      },
      {
        name: "Ancient Black Dragon",
        icon: "🐉",
        dc: 16,
        flavor: "Het moeras heeft hem gevoed en hij heeft het moeras gevormd. Zijn zuur heeft steden opgelost. Hij is niet kwaad — hij is gewoon ongeïnteresseerd, en dat is erger.",
        successText: "Je vindt de oude wond onder zijn linkerkaak — een erfenis van een held die hem bijna versloeg. Hij trekt zich terug. Niet van angst. Van respect.",
        failText: "Een straal zuur mist je gezicht maar treft je arm. Je mouw bestaat niet meer en de huid eronder heeft het ook moeilijk.",
      },
    ],
    "Nature": [
      {
        name: "Avatar of the Blight",
        icon: "🕸️",
        dc: 15,
        flavor: "Een enorme spin van wortels, schors en zwart sap trekt zich los uit het bos zelf.",
        successText: "Je ontdekt een zwakke plek waar natuur en corruptie elkaar raken.",
        failText: "De grond opent zich onder haar gewicht.",
      },
    ],
    "Religion": [
      {
        name: "Reaper",
        icon: "💀",
        dc: 15,
        flavor: "Hij verzamelt zielen als anderen munten verzamelen. Jij bent een toevoeging aan de collectie.",
        successText: "Je spreekt zijn ware naam uit — vergeten door de levenden, maar niet door jou.",
        failText: "Zijn vinger raakt je voorhoofd. Je voelt iets vertrekken.",
      },
      {
        name: "Lich",
        icon: "🧙",
        dc: 15,
        flavor: "Hij heeft de dood overwonnen door alles op te geven wat de dood de moeite waard maakt om te vluchten. Nu zit hij hier, oneindig geduldig, omringd door eeuwen aan mislukte helden.",
        successText: "Je vindt zijn phylactery — de ziel-anker — en houdt het omhoog. Voor het eerst in eeuwen ziet hij angst in zijn eigen ogen.",
        failText: "Zijn spreuk treft je geest, niet je lichaam. Je vergeet even wie je bent. Even.",
      },
      {
        name: "Death Knight",
        icon: "🖤",
        dc: 14,
        flavor: "Een ridder die zijn eed brak en stierf in schande — maar niet bleef. Zijn zwaard brandt zwart en zijn ogen gloeien rood. Hij vecht niet voor een meester. Hij vecht uit principe.",
        successText: "Je breekt zijn gevallen eed uit zijn zwaard met heilig staal. Het wapen dooft. Hij wankelt als een man die voor het eerst in jaren iets voelt.",
        failText: "Zijn hellfire-zwaard laat een brandmerk op je schild dat er niet meer af gaat. De hitte ervan voel je nog lang daarna.",
      },
      {
        name: "Green Hag",
        icon: "🧙‍♀️",
        dc: 14,
        flavor: "Ze ziet er oud uit maar beweegt als water. Haar vingers zijn te lang, haar glimlach te breed, en ze kent je naam al voor je hem noemt.",
        successText: "Je breekt haar naam-betovering door haar eigen naam hardop uit te spreken — die je ergens onderweg hebt gevonden. Ze deinst terug.",
        failText: "Ze fluistert iets in een taal die je niet kent. Je arm gehoorzaamt haar voor drie tellen. Dat is lang genoeg.",
      },
    ],
  },
  trap: {
    "Acrobatics": [
      {
        name: "Valput",
        icon: "🕳️",
        dc: 10,
        flavor: "De vloer kraakt en een put klapt open onder je voeten — drie meter diepte, bodem niet zichtbaar. Alleen reflexen redden je hier.",
        successText: "Een snelle zijsprong, een rol, en je staat aan de overkant met klotsend hart maar heel lichaam.",
        failText: "Je klautert aan de rand, handen schaaffend op de koude steen, en trekt je moeizaam omhoog.",
      },
      {
        name: "Gouden brug",
        icon: "🤸",
        dc: 13,
        flavor: "Een brug van gegoten goud — actief aan het smelten, de platen oranje-rood gloeiend. Tempo is alles: lang stilstaan verbrandt je laarzen.",
        successText: "Je danst over de platen met kleine snelle passen. Je bereikt de overkant met rokende zolen en een glimlach.",
        failText: "Een seconde te lang op dezelfde plaat. Je laarzool sist, je glijdt, je handen grijpen de gloeiende reling. Beide dingen pijn.",
      },
      {
        name: "Lavavloer",
        icon: "🌋",
        dc: 12,
        flavor: "De gang heeft zijn vloer verloren aan gloeiende lavapockets. Kleine stenen eilandjes springen eroverheen — elk niet groter dan een voetafdruk.",
        successText: "Je beoordeelt de sprongen in een seconde en executeert ze als een acrobaat. Rokende zolen, maar heel aan de overkant.",
        failText: "Je voet mist de derde steen met een halve centimeter. Te heet — je laarzool is aangetast en de omweg kost je kostbare tijd.",
      },
      {
        name: "Gladde richel",
        icon: "🧗",
        dc: 12,
        flavor: "Dertig centimeter breed, nat van een onzichtbaar waterlek, met veertig meter lucht ernaast. De richel glinstert gevaarlijk in het fakkellicht.",
        successText: "Je spreid je vingers op de wand, fixeert je blik ver voor je en schuifelt langs met de precisie van een bergklimmer. Elke stap bewust.",
        failText: "Je voet glijdt weg en je grijpt instinctief de wand. Je herstelt, maar met een pijnlijke schram en twee minuten extra voorzichtigheid.",
      },
    ],
    "Athletics": [
      {
        name: "Instortende houten brug",
        icon: "🌉",
        dc: 12,
        flavor: "De houten brug over de kloof is verpulverd door vocht en tijd. Elke stap brengt nieuwe splintergeluiden en veertig meter lucht onder je.",
        successText: "Je sprint met lange passen over de brug. De laatste planken scheuren weg onder je terwijl jij de overkant raakt.",
        failText: "De brug geeft weg bij de vierde stap. Je hangt aan de rand, armen brandend, en trekt je moeizaam omhoog.",
      },
      {
        name: "Instortende stenen brug",
        icon: "🌉",
        dc: 13,
        flavor: "De stenen brug is al generaties oud — barsten door elke steen, mortel dat in stofwolkjes neervalt bij elke stap. Ze kan elk moment bezwijken.",
        successText: "Je rent met alles wat je in je benen hebt. De brug verdwijnt in de diepte achter je hielen terwijl jij de overkant raakt.",
        failText: "Je zakt door het middelste segment heen en hangt aan een richel tot je jezelf los trekt. Kostbare tijd en energie zijn weg.",
      },
      {
        name: "Vallende zuilen",
        icon: "🏛️",
        dc: 13,
        flavor: "Massieve stenen zuilen storten achter elkaar in een domino van onstuitbare steen — de eerste knapt met een donderend geraas, dan de tweede, dan de derde.",
        successText: "Je sprint met timing afgestemd op de intervallen. De laatste zuil raakt de grond achter je hielen. Stofwolk achter je, hele botten voor je.",
        failText: "De derde zuil raakt je schouder met zijn vallende rand. Niet de volle massa, maar genoeg om je van je benen te slaan.",
      },
      {
        name: "Touwbrug zonder ankers",
        icon: "🪢",
        dc: 12,
        flavor: "De touwbrug heeft zijn ankerpunten aan de overkant verloren en zwaait vrij boven de kloof. Elke stap versterkt het slingeren.",
        successText: "Je gebruikt het slingeren in je voordeel, springt de laatste twee meter op het juiste moment. Je landt hard maar heel.",
        failText: "Het slingeren wordt te hevig en het laatste ankertouw scheurt. Je bungelt boven de kloof en trekt je moeizaam terug naar het startpunt.",
      },
      {
        name: "Stortende grot",
        icon: "🪨",
        dc: 13,
        flavor: "De grottunnel stort langzaam in — een steen per seconde, dan twee, dan vijf. De opening aan het einde wordt zichtbaar kleiner.",
        successText: "Je perst je door de opening net voor het laatste steenblok hem blokkeert en rolt aan de andere kant in een wolk van steenstof.",
        failText: "Rotsblokken blokkeren het pad net voor je er bent. Kostbare tijd en energie verloren aan een sprint die net te laat was.",
      },
      {
        name: "Zware poort",
        icon: "🚪",
        dc: 12,
        flavor: "Een massieve ijzeren poort, haar scharnieren verstijfd door decennia stilstand. De mechanismen die haar ooit bewegelijk maakten zijn allang kapot.",
        successText: "Je schouder ertegen, voeten breed. De scharnieren krijsen als banshees — maar dan geven ze mee. Genoeg om door te glippen.",
        failText: "De poort geeft geen millimeter. Hij is te zwaar, de rust te diep ingevroren. Je zoekt een zijgang die je kostbare minuten kost.",
      },
      {
        name: "Roper-grot",
        icon: "🦑",
        dc: 12,
        flavor: "Tentakels van steen en vlees hangen uit het plafond. Geen web, geen kist — alleen greep.",
        successText: "Je hakt jezelf los en duikt onder de volgende slag door.",
        failText: "Een tentakel heft je op. Loskomen kost je adem en tijd.",
      },
    ],
    "Athletics OR Acrobatics": [
      {
        name: "Risico sprint",
        icon: "🏃",
        dc: 13,
        flavor: "Een gevaarlijk ganggedeelte met vallende objecten en activerende vallen — maar de aard van het gevaar laat twee stijlen toe: brute snelheid of gecontroleerde behendigheid.",
        successText: "Je kiest de methode die je lichaam kent het best en executeert haar met volle concentratie. Je komt er doorheen.",
        failText: "Je tempo of je precisie laat je op het verkeerde moment in de steek. Je bent er doorheen, maar vertraagd en beschadigd.",
      },
    ],
    "Athletics OR Sleight of Hand": [
      {
        name: "Gevangen deur",
        icon: "🚪",
        dc: 12,
        flavor: "Een stevige eiken deur blokkeert de enige toegang — vergrendeld maar niet onbreekbaar, sterk maar niet onforceeerbaar. Forceren of peutelen, beiden hebben een prijs.",
        successText: "Je kiest de methode die bij je past en executeert hem correct. De deur geeft mee. Je bent binnen.",
        failText: "De deur houdt stand bij kracht, het slot weigert bij finesse. Tijd en energie verspild — je zoekt een andere aanpak.",
      },
    ],
    "Dexterity": [
      {
        name: "Gelatinous Cube",
        icon: "🟢",
        dc: 12,
        flavor: "Je fakkel vangt een subtiele trilling in de lucht op. Een Gelatinous Cube, volledig transparant, vult de volledige gangbreedte.",
        successText: "Je krimpt je schouders in en glijdt met millimeterprecisie langs de glibberige buitenwand. Droge kleren, bonkend hart.",
        failText: "Je schoen verdwijnt in de cube met een weerzinwekkend slorpgeluid. Je trekt hem los, maar verliest een pijnlijke minuut.",
      },
    ],
    "Investigation": [
      {
        name: "Mimic-kist",
        icon: "🗃️",
        dc: 11,
        flavor: "De kist is te mooi — glanzend hout, gouden sloten, strategisch in het licht. Precies zoals een mimic zich positioneert om te jagen.",
        successText: "Je tikt met je schede tegen de deksel. Holle, dode klank — geen mimic. Je loopt opgelucht door.",
        failText: "HAP! De deksel klapt open met een gebit van tanden. Je rukt je hand terug terwijl de kist teleurgesteld sist.",
      },
      {
        name: "Illusie-trap",
        icon: "🪞",
        dc: 12,
        flavor: "De vloer is te mooi — perfect gladde tegels, zelfs verlicht van onderuit. Niets in deze vervallen kerker is zo netjes. Dat is verdacht.",
        successText: "Je knipt voor de vloer. De illusie flakkert en onthult een put er direct achter. Je loopt er koel omheen.",
        failText: "Je been verdwijnt tot aan de knie in wat niets blijkt. Je staat verward op de echte vloer, je oriëntatie volledig geschud.",
      },
    ],
    "Nature": [
      {
        name: "Natuurlijke val",
        icon: "🪤",
        dc: 12,
        flavor: "De vegetatie vormt een patroon dat te symmetrisch is voor willekeur — bomen in een kring, gras plat in een richting. De natuur zelf is hier een valstrik.",
        successText: "Je herkent een Tangler-veld en loopt langs de rand in plaats van erdoorheen. De andere kant, droge laarzen.",
        failText: "Je stapt het centrum in en de plantenwortels verstrikken je enkels direct. Je bevrijdt jezelf, maar het kost je een stuk broek en kostbare tijd.",
      },
    ],
    "Perception": [
      {
        name: "Verborgen hinderlaag",
        icon: "👁️",
        dc: 13,
        flavor: "De verkeerde soort stilte — niet de rust van een veilige plek maar de gespannen stilte van iets dat wacht. Geen vogels, geen wind, geen enkel willekeurig geluid.",
        successText: "Je ziet het touw op kniehoogte, bijna onzichtbaar in het licht. Je stapt er hoog overheen en loopt door terwijl de val ongetriggerd wacht.",
        failText: "Je voet raakt het touw. Een regen van stenen van het plafond, smal maar precies. Een raakt je schouder. Niets gebroken, alles bezeerd.",
      },
      {
        name: "Verborgen bedreiging",
        icon: "👁️",
        dc: 13,
        flavor: "Een prikkel tussen je schouderbladen, een verhoogde hartslag zonder oorzaak. Iets in deze ruimte fixeert zijn aandacht op jou. Vind het voor het handelt.",
        successText: "Je scant van laag naar hoog en vindt het actieve waakzegel in de bovenste hoek. Je deactiveert het voor het zijn lading kan sturen.",
        failText: "Te laat — het zegel heeft je gesignaleerd. Ergens dieper gaat een bel. Je hebt maximaal drie minuten.",
      },
    ],
    "Sleight of Hand": [
      {
        name: "Valse sleutel",
        icon: "🗝️",
        dc: 12,
        flavor: "Het slot ziet er oud uit maar de sleutel erin is te nieuw en te glanzend voor het omringende roest. Een booby-trap met de sleutel als lokvink.",
        successText: "Je voelt de verborgen veer voordat je draait. Je neutraliseert het trigger-mechanisme eerst en opent het slot veilig, zonder alarm.",
        failText: "Je draait met te veel haast en een klink-mechanisme klapt in. Ergens dieper rinkelt een bel. Kostbare aandacht op jouw positie gevestigd.",
      },
      {
        name: "Valstrik ontmanteling",
        icon: "🧨",
        dc: 13,
        flavor: "De gang voor je is vol draadjes verbonden met kleine mechanische triggers. Een gnomisch ontwerp, efficiënt en compact. Iemand wist precies wat ze deden.",
        successText: "Je werkt van buiten naar binnen en neutraliseert de triggers in de volgorde die het domino-effect doorbreekt. Vijf minuten werk, weg vrij.",
        failText: "Je mist de verbinding tussen het vijfde en zesde draadje. Een kleine explosie van rook en knallend metaal — je oren suizen.",
      },
    ],
  },
  combat: {
    "Athletics": [
      {
        name: "Ork-hinderlaag",
        icon: "🪓",
        dc: 11,
        flavor: "Een groep orcs stormt uit de bomen. Ze ruiken bloed en willen meer. Hun aanvoerder wijst naar jou.",
        successText: "Je slaat de aanvoerder tegen de grond — de rest vlucht.",
        failText: "Ze drijven je in een hoek. Bloed en modder.",
      },
      {
        name: "Warchief-uitdaging",
        icon: "⚔️",
        dc: 13,
        flavor: "De warchief gooit zijn bijl voor je voeten. Een uitdaging. Iedereen kijkt toe.",
        successText: "Je neemt zijn bijl en breekt die in tweeën. Hij knikt — respect.",
        failText: "Je struikelt. De orcs brullen. De warchief verlaat je levend, maar net.",
      },
      {
        name: "Skelet-vendel",
        icon: "💀",
        dc: 11,
        flavor: "Ze marcheren in formatie. Rattlend bot, verroest staal. Geen bevelen nodig — ze zijn allang voorbij gehoorzaamheid.",
        successText: "Je breekt de formatie en verbrijzelt de aanvoerder. De rest valt uiteen.",
        failText: "Ze rijden je onder. Je ontsnapt, maar niet ongeschonden.",
      },
      {
        name: "Ettercap-nest",
        icon: "🕷️",
        dc: 13,
        flavor: "De bomen zijn vol eieren. En de moeder is thuis.",
        successText: "Je vernielt het centrale nest voor ze zich kan organiseren.",
        failText: "Ze springt. Je klap mist. Haar klauwen niet.",
      },
      {
        name: "Blight-spinnen",
        icon: "🕷️",
        dc: 12,
        flavor: "Tussen de bomen bewegen vormen van wortels en schors. Pas wanneer ze dichterbij komen zie je de poten.",
        successText: "Je vernietigt de kern van de zwerm voordat ze je omsingelen.",
        failText: "De spinnen springen tegelijk. Overal klauwen en wortels.",
      },
    ],
    "Combat": [
      {
        name: "Kobold-kamp",
        icon: "⚔️",
        dc: 11,
        flavor: "Vijf kobolds in zelfgemaakte wapenrusting — omgekeerde potten als helmen — omringen je met de gewichtige ernst van wezens die iets te bewijzen hebben.",
        successText: "Je vecht je efficiënt door de formatie heen terwijl ze struikelen over elkaars voeten bij hun vluchtpoging.",
        failText: "Te veel tegelijk. Je deinst terug onder een regen van kleine maar pijnlijke slagen, de kobolds piepend van triomf.",
      },
      {
        name: "Zombie-horde",
        icon: "🧟",
        dc: 11,
        flavor: "Schuifelende voetstappen en laag gereutel. Dan zijn ze er — een tiental zombies, ogen glazig leeg, armen strekkend, geen haast want ze hoeven niet te haasten.",
        successText: "Je richt je op de centrale schakel en haalt hem neer. De horde verliest richting en je schiet door de bres die valt.",
        failText: "Te dicht op elkaar. De massa duwt terug en je deinst met kostbare stappen achteruit, het gereutel als aanklacht achter je.",
      },
    ],
    "Intimidation": [
      {
        name: "Dragon's Lair",
        icon: "🐉",
        dc: 14,
        flavor: "De grot ruikt naar verbrand bot en zwavel. De berg goud beweegt — en je ziet de schubben, de klauwen, het oog dat langzaam opengaat.",
        successText: "Je houdt zijn blik door drie lange ademhalingen. Een schram op zijn nekschilden is alles wat je haalt, maar hij honoreert de moed.",
        failText: "De draak brult — een geluid dat je voelt in je borstbeen — en de hittegolf slaat je achteruit. Je benen nemen zelf de beslissing.",
      },
      {
        name: "Harpi-kolk",
        icon: "🦅",
        dc: 11,
        flavor: "Vanuit een diepe kloof duiken harpies — vleugels, klauwen en lied dat je naar de rand trekt.",
        successText: "Je schreeuwt harder dan hun zang en rent langs de wand terwijl ze aarzelen.",
        failText: "Een klauw scheurt je mantel en je stapt een tel te dicht naar de rand.",
      },
    ],
    "Perception": [
      {
        name: "Goblin-hinderlaag",
        icon: "👺",
        dc: 10,
        flavor: "Het struikgewas is te stil — geen vogels, geen wind. Dan een flits van groen: je staat midden in een perfecte goblin-hinderlaag.",
        successText: "Je ziet het touw, duikt, rolt en schiet erdoorheen voordat ze beseffen dat er iets fout is gegaan.",
        failText: "Een pijl scheert langs je helm en het verraste gegiechel achter je geeft je net genoeg vleugels om terug te strompelen.",
      },
    ],
  },
  magic: {
    "Arcana": [
      {
        name: "Zegel van Haste",
        icon: "⚡",
        dc: 11,
        flavor: "Op de muur pulseert een kobaltblauw zegel, zijn runen roterend als een kloppend hart. Actieve magie, oud en wachtend.",
        successText: "Je traceert de buitenste rune en spreekt het triggerwoord. Een golf energie raast door je — sneller, lichter, beter.",
        failText: "Verkeerde ingangsrune. De energie ontploft in een felle flits en gooit je een meter achteruit. Sterretjes.",
      },
      {
        name: "Magische runendeur",
        icon: "🔮",
        dc: 12,
        flavor: "Een massieve zwarte deur omrand door actieve runen die in een complexe sequentie oplichten en doven. Onjuiste invoer resulteert in een magische terugslag.",
        successText: "Je voert de correcte combinatie in. De runen worden groen, de deur ademt open op een luchtkussen van energie.",
        failText: "Derde positie was verkeerd. Een bliksemflits ontlaadt zich door je arm. De deur wacht geduldig op een volgende poging.",
      },
      {
        name: "Teleportatiecirkel",
        icon: "✨",
        dc: 13,
        flavor: "Runen branden blauwwit in het steen, pulserend als een levend hart. De lucht erboven trilt en smaakt naar ozon en onbekende plaatsen.",
        successText: "Je spreekt het activeringswoord. Een hartslag later sta je aan de andere kant van een gang die te voet uren had gekost.",
        failText: "Verkeerd woord. De cirkel flitst wit en ontlaadt zijn energie in alle richtingen. Je staat duizelig op precies dezelfde plek.",
      },
      {
        name: "Vloek van pech",
        icon: "🎲",
        dc: 11,
        flavor: "Een kristallen dobbelsteen zweeft op ooghoogte, gloeiend paars. Boven je hoofd wordt elke potentieel goede gooi zichtbaar omgezet naar het tegendeel.",
        successText: "Je ontbindt de magische link. De vloek slaat terug op zijn eigen bron — de steen impodeert in een puf van paarse rook.",
        failText: "Pech. Echt, kosmisch pech. Je stolpert over een vlakke vloer en de steen draait tevreden door.",
      },
      {
        name: "Tijdwarp",
        icon: "⌛",
        dc: 14,
        flavor: "Drie seconden geleden stond je hier ook — je ziet jezelf staan. En drie seconden in de toekomst ook. Alle drie in dezelfde gang, op hetzelfde moment.",
        successText: "Je accepteert de paradox bewust — je was, bent en zult zijn — en de tijdslus lost op als een strak touw dat loslaat. Je schiet vrij vooruit.",
        failText: "Je bent even elk moment tegelijk en geen enkel moment specifiek. Duizelig en verward sta je een volle minuut gevangen in je eigen tijdstroom.",
      },
      {
        name: "Oude runensteen",
        icon: "🪨",
        dc: 14,
        flavor: "Een vrijstaande steen van zwart graniet midden op het pad, zijn oppervlak bedekt met runen in blauwachtig licht. Oud, actief en wachtend op een spreker.",
        successText: "Je traceert de patronen en herkent een eeuwenoud navigatiezegel. De steen onthult een energiestroom naar een verborgen magisch pad.",
        failText: "Je activeert per ongeluk de beschermingssectie. Een golf magische weerstand duwt je achteruit en breekt je concentratie volledig.",
      },
      {
        name: "Ork-sjamaanvloek",
        icon: "💀",
        dc: 12,
        flavor: "Een sjamanin scandert boven een smeulend vuur. Haar ogen worden wit. Ze ziet je.",
        successText: "Je herkent het patroon van de vloek en breekt hem met een scherpe beweging.",
        failText: "De vloek raakt doel. Je benen voelen als lood.",
      },
      {
        name: "Vloek van de lich",
        icon: "🌑",
        dc: 13,
        flavor: "Een koude hand trekt door de lucht zelf. Iemand — iets — heeft hier lang geleden macht vergrendeld.",
        successText: "Je ontrafelt de spreuk. De koude wijkt.",
        failText: "De vloek klampt zich vast. Je voelt ouder.",
      },
      {
        name: "Behir-storm",
        icon: "⚡",
        dc: 13,
        flavor: "Een lang, gesegmenteerd beest slingert zich door de bomen. Bliksem schiet van zijn bek.",
        successText: "Je leest zijn aanvalspatroon en duikt precies op tijd.",
        failText: "De bliksem grijpt je. Je haar staat rechtop voor een uur.",
      },
      {
        name: "Heksenkring",
        icon: "🌀",
        dc: 11,
        flavor: "Een ring van paddenstoelen. Iemand heeft hier recent geteleporteerd — of iets is weggegaan dat niet weg had moeten gaan.",
        successText: "Je leest het magische residu en gebruikt het om een stap vooruit te zetten.",
        failText: "Je stapt in de ring. Je stapt er aan de andere kant verkeerd uit.",
      },
      {
        name: "Verkeerde sterren",
        icon: "👁️",
        dc: 12,
        flavor: "De sterren boven je vormen patronen die niet zouden mogen bestaan.",
        successText: "Je verbreekt het visioen voordat het terugkijkt.",
        failText: "Iets merkt op dat jij kijkt.",
      },
    ],
    "Arcana OR Religion": [
      {
        name: "Mystieke keuze",
        icon: "🔮",
        dc: 13,
        flavor: "Een magische barrière reageert op zowel academische magie als goddelijke invloed — maar op verschillende manieren. Arcana doorsnijdt, Religie verzacht.",
        successText: "Je kiest de discipline die in jou het sterkst is. De barrière herkent de taal en buigt mee, een opening creërend die lang genoeg blijft.",
        failText: "Je formulering of gebed mist de vereiste precisie. De barrière weert je af met een energiestoot. Omweg vereist.",
      },
    ],
    "Constitution": [
      {
        name: "Etherische mist",
        icon: "🌫️",
        dc: 10,
        flavor: "Groenachtige damp vult de gang in seconden. Je proeft koper en ozon — de tingle van iets dat je niet wilt inademen.",
        successText: "Je houdt je adem in en rent door op pure longinhoud. Aan de andere kant adem je schoon uit. Heel, zij het met een metalige nasmaak.",
        failText: "Je haalt eenmaal inadem voor je kunt tegenhouden. Hoofdpijn perst je schedel en alles draait terwijl de gang weigert stil te staan.",
      },
      {
        name: "Basilisk-blik",
        icon: "🦎",
        dc: 12,
        flavor: "Het beest draait zijn kop. Zijn ogen gloeien geelgroen. Je voelt je ledematen zwaar worden.",
        successText: "Je wendt je blik af op het laatste moment en omzeilt hem via zijn schaduw.",
        failText: "Je benen worden stijf. Je valt op één knie.",
      },
    ],
    "Insight": [
      {
        name: "Wraithgezang",
        icon: "👻",
        dc: 12,
        flavor: "Een transparante figuur zingt een oud lied dat je kent, maar niet herinnert. Ze ziet je.",
        successText: "Je herkent haar pijn en spreekt haar naam. Ze verdwijnt in rust.",
        failText: "Het gezang treft je ziel. Je handen trillen.",
      },
    ],
    "Religion": [
      {
        name: "Heilige ruïne",
        icon: "⛪",
        dc: 13,
        flavor: "Een ingestorte tempel, haar dak allang vergaan. Tussen het puin pulseert nog een zwak residueel licht — goddelijke energie die weigert te doven.",
        successText: "Een gebed van herkenning in de correcte liturgische vorm. De energie stroomt zegenend door je heen en verlicht je stap.",
        failText: "Je gebed mist iets en de energie keert zich defensief. Een golf afstoting verstoort je concentratie en laat je geIrriteerd en gefocust achter.",
      },
    ],
    "Wisdom": [
      {
        name: "Fluistering van de Blight",
        icon: "🖤",
        dc: 12,
        flavor: "Een stem klinkt vanuit de bomen. Rustig. Nieuwsgierig. Ze kent jouw naam.",
        successText: "Je sluit de verbinding af voordat de stem dieper kan doordringen.",
        failText: "Een vraag blijft hangen in je gedachten lang nadat de stem verdwenen is.",
      },
      {
        name: "Gebroken werkelijkheid",
        icon: "🌀",
        dc: 13,
        flavor: "De bomen staan op de verkeerde plekken. Daarna weer niet.",
        successText: "Je houdt vast aan wat echt is.",
        failText: "Je twijfelt aan alles wat je ziet.",
      },
    ],
  },
  social: {
    "Constitution": [
      {
        name: "Rustige herberg",
        icon: "🛏️",
        dc: 9,
        flavor: "Stoofpot met tijm en een echte open haard — na uren koude kerker is dit een aanslag op je wilskracht. De waardin houdt een dampende kom omhoog.",
        successText: "Je neemt een slok en een hap, zet de kom neer en sprint door de deur voor je van gedachten verandert.",
        failText: "Je zakt neer op een kruk voor \"even bijkomen.\" Als je ogen weer opengaan staat de waardin ongeduldig naast je.",
      },
    ],
    "Deception": [
      {
        name: "Goblin-gokspel",
        icon: "🎰",
        dc: 10,
        flavor: "Drie goblins om een ton met dobbelstenen en een stapel glinsterende munten. Ze kijken op. \"Speel mee?\" vraagt er een. \"Iedereen speelt mee.\"",
        successText: "Je verliest drie rondes overtuigend opzettelijk, toont je lege beurs als inzet. Ze lachen en laten je door — niemand speelt zo slecht zonder plan.",
        failText: "Ze verslaan je en gaan er uitvoerig prat op. Je loopt door onder een regen van goblin-triomf terwijl ze je munten optellen.",
      },
      {
        name: "Misleidende woorden",
        icon: "🎭",
        dc: 12,
        flavor: "Een tolwachter stelt scherpe vragen die je niet eerlijk kunt beantwoorden — en die hij weet dat je niet eerlijk kunt beantwoorden. Hij speelt dit spelletje graag.",
        successText: "Je verhaal bevat precies genoeg waarheden om de leugens te verankeren. Hij laat je door met een sceptisch maar verslagen knikje.",
        failText: "Een inconsistentie — een datum die niet klopt. Hij pikt het onmiddellijk op en houdt je langer op dan je je kunt veroorloven.",
      },
    ],
    "Insight": [
      {
        name: "Kobold-inzicht",
        icon: "🦎",
        dc: 9,
        flavor: "Een kleine kobold met een breed glimlach staat langs het pad, handjes achter zijn rug. \"Ik ken de kortste weg,\" fluistert hij. \"Volg mij.\"",
        successText: "Hij staat op de richting van de langste route terwijl hij over de kortste spreekt. Je doorziet het en loopt door op eigen kompas.",
        failText: "Tien minuten later sta je voor een muur met een grinnikkende kobold erop geschilderd. Fout.",
      },
      {
        name: "Verborgen waarheid",
        icon: "🧠",
        dc: 13,
        flavor: "Een reiziger geeft je routeinfo maar zijn ogen wijken te snel weg bij cruciale details en zijn handen bewegen te veel voor iemand die niets verbergt.",
        successText: "Een toetsvraag. De aarzeling in zijn antwoord is lang genoeg. Je kiest de route die hij niet adviseerde — en het was de goede.",
        failText: "Je neemt zijn woorden voor waarheid. Twintig minuten later begrijp je de structuur van de omweg die hij je heeft gegeven.",
      },
      {
        name: "Liegende gids",
        icon: "🧍",
        dc: 12,
        flavor: "Een vriendelijke vreemdeling biedt routebegeleiding aan — gratis, onopgevraagd en met net iets te veel enthousiasme. Zijn oogcontact klopt niet.",
        successText: "Een toetsvraag. De aarzeling in zijn antwoord is een tel te lang. Je bedankt hem en neemt de tegenovergestelde richting.",
        failText: "Zijn verhaal klinkt consistent. Twintig minuten later begrijp je de structuur van de omweg die hij je heeft gegeven.",
      },
      {
        name: "Echte vijand",
        icon: "🧠",
        dc: 13,
        flavor: "In een groep van vier reizigers observeert er een jou met aandacht die verder gaat dan toevallige nieuwsgierigheid. De intentie is er — je moet hem vinden.",
        successText: "Je herkent zijn patroon: hij kijkt nooit naar jou als jij kijkt, maar altijd als je de andere kant op kijkt. Je plant jezelf strategisch. Veilig.",
        failText: "Je inschatting was verkeerd. De echte bedreiging benaderde je van de andere kant terwijl jij de verkeerde persoon bewond.",
      },
      {
        name: "Verdorven Druïde",
        icon: "🍂",
        dc: 13,
        flavor: "De druïde spreekt vriendelijk. Zijn bloemen bloeien zwart.",
        successText: "Je merkt de tegenstrijdigheden in zijn verhaal en houdt afstand.",
        failText: "Zijn woorden klinken logisch. Misschien té logisch.",
      },
    ],
    "Intimidation": [
      {
        name: "Bandiet-tol",
        icon: "💰",
        dc: 11,
        flavor: "Drie bandieten aan een touw dat de weg blokkeert. \"Passagetol,\" zegt de grootste vriendelijk, alsof hij een dienst verleent.",
        successText: "Je beschrijft met anatomische precisie de draak die je net hebt zien landen. De kleintjes geloven je al bij het woord \"draak.\" Ze verdwijnen.",
        failText: "Ze lachen — het lachen van mensen die hun dag doorbrengen met intimideren. Je zelfvertrouwen verlies je zichtbaar.",
      },
      {
        name: "Intimidatie duel",
        icon: "😠",
        dc: 13,
        flavor: "Een rivaliserende groep blokkeert de kruising met de ontspannen arrogantie van mensen die gewend zijn hun zin te krijgen door aanwezigheid alleen.",
        successText: "Je houdt de blik van de leider tot zij bewegen. Ze stappen opzij met ongemakkelijk gemompel.",
        failText: "Ze lezen de spanning in je schouders. Geprikkeld door de perceptie van zwakte worden ze juist agressiever en harder blokkerend.",
      },
      {
        name: "Tribuutpoort",
        icon: "🚧",
        dc: 10,
        flavor: "Een ork-wachter verspert de weg en eist tribuut. Achter hem: meer orcs.",
        successText: "Je kijkt hem strak aan. Hij wijkt.",
        failText: "Hij lacht je uit en geeft je een duw achteruit.",
      },
    ],
    "Medicine": [
      {
        name: "Zieke reiziger",
        icon: "⚕️",
        dc: 12,
        flavor: "Een figuur half bewusteloos langs het pad, koorts op zijn wangen, uitrusting verspreid. Hij heeft hulp nodig en hij heeft die nu nodig.",
        successText: "Grotkoorts, een wond in zijn been, het juiste kruid uit je tas. Hij bijkomt en geeft je als dank een schets van een veilige doorgang.",
        failText: "Je behandeling stabiliseert hem niet zoals gehoopt. Je hebt tijd verloren en hij heeft niet de kracht om je de informatie te geven die hij wellicht had.",
      },
    ],
    "Performance": [
      {
        name: "Straatoptreden",
        icon: "🎤",
        dc: 12,
        flavor: "Een kleine menigte rond een leeg tonnetje als podium, verwachtingsvol kijkend in jouw richting. Ze willen iets zien en jij bent de meest interessante persoon aanwezig.",
        successText: "Je optreden werkt. De sympathie die je verdient wordt omgezet in een tip, een aanwijzing of een deur die voor je opengaat.",
        failText: "De menigte verspreid zich geleidelijk. Je staat op het lege podium met de specifieke leegte van een optreden dat niet werkte.",
      },
    ],
    "Persuasion": [
      {
        name: "Troll-wachter",
        icon: "🗣️",
        dc: 13,
        flavor: "Een berg van spiermassa blokkeert de poort. \"Vertel mij iets grappigs,\" grommelt hij in een stem als malende molenstenen. \"Dan mag jij door.\"",
        successText: "De troll brult met een lach die stenen van het plafond schudt. \"Goed verhaal,\" zegt hij, en stapt opzij.",
        failText: "Je mop valt dood neer. De troll staart je aan met de intensiteit van een wezen dat humor in theorie begrijpt maar in de praktijk niet.",
      },
      {
        name: "Pit fiend-contract",
        icon: "📜",
        dc: 15,
        flavor: "Een impeccabel geklede figuur met subtiele rode huid en horentjes onder een hoed biedt je een perkament aan. \"Beste deal die je ooit zult zien,\" verzekeren ze.",
        successText: "Je schraapt drie clausules weg, herformuleert twee anderen in je voordeel en vraagt een zegel dat de duivel bindt aan zijn eigen voorwaarden. Hij tekent.",
        failText: "Je ondertekent bij de stippellijn. Drie seconden later begrijp je wat je hebt weggegeven. De duizeligheid van \"recht op je eigen toekomstdromen\" is heel specifiek.",
      },
      {
        name: "Diplomatieke doorgang",
        icon: "🤝",
        dc: 13,
        flavor: "Een zwaar bewapende poortwachter blokkeert de overgang met de rust van iemand die zijn orders kent en geen interesse heeft in verhalen — alleen in resultaten.",
        successText: "Je presenteert feiten en logica in de juiste volgorde. Hij weegt ze, knikt eenmaal en doet een halve stap opzij. Verdiend.",
        failText: "Je argumenten zijn niet overtuigend genoeg voor zijn standaarden. Hij stuurt je naar een zijpadroute die trager en omslachtiger is.",
      },
      {
        name: "Feest in het bos",
        icon: "🍄",
        dc: 11,
        flavor: "Muziek, licht en lachen tussen de bomen. Fey dansen op een open plek. Ze nodigen je uit.",
        successText: "Je danst mee, geeft niets weg, en vertrekt met een geschenk.",
        failText: "Je noemt je eigen naam. Ze houden die.",
      },
    ],
    "Persuasion OR Intimidation": [
      {
        name: "Onderhandeling",
        icon: "🤝",
        dc: 12,
        flavor: "Een bewaker staat in de weg met twee mogelijke reacties: begrip of zelfbehoud. Jij kunt beide triggeren. De keuze zegt iets over je aanpak.",
        successText: "Je kiest de juiste aanpak voor dit type bewaker en executeert hem met de juiste dosering. Hij stapt opzij.",
        failText: "Je kiest de verkeerde aanpak. Je overreedt iemand die alleen kracht respecteert, of je intimideert iemand die bescherming heeft. Geweigerd.",
      },
    ],
    "Religion": [
      {
        name: "Vampier-tea",
        icon: "🧛",
        dc: 12,
        flavor: "Een bleekwitte figuur in avondkleding bij een rokend theekopje. Geen schaduw op de vloer, geen weerspiegeling in de vitrine. \"Kom zitten. Thee?\"",
        successText: "Je bedankt beleefd met een geloofwaardig excuus. De vampier knikt langzaam en respectvol. De afwijzing is keurig behandeld.",
        failText: "Je accepteert de thee en de vampier praat je oren van je hoofd over zijn glorierijke zes eeuwen. Je verliest je focus en tijdsbesef volledig.",
      },
    ],
    "Sleight of Hand": [
      {
        name: "Zakkenroller",
        icon: "🎭",
        dc: 10,
        flavor: "Bij een druk kruispunt botst iemand te berekend tegen je schouder — ogen opzettelijk de andere kant op, hand al op weg naar jouw beurs.",
        successText: "Je pakt zijn pols voordat hij ook maar een knoop heeft losgepeuterd. Hij verdwijnt snel. Jij loopt door met zijn vertrek als winst.",
        failText: "Je voelt de leegte in je mantelzak net een tel te laat. Afgeleid, op het exacte verkeerde moment.",
      },
      {
        name: "Zakkenroller in de menigte",
        icon: "🪙",
        dc: 12,
        flavor: "Een drukke markt bij de poort — handelaars, kopers, kinderen samengedrukt in een nauwe doorgang. Handen bewegen hier sneller dan ogen.",
        successText: "Jij voelt de hand voor hij voelt dat jij hem voelt. Je haalt hem weg en de dief verdwijnt in de menigte met niets.",
        failText: "Een pols grijpt de jouwe — niet de dief maar een handelaar die denkt dat jij zijn waar pikt. De verwarring kost je tijd en gezichtsverlies.",
      },
      {
        name: "Wisseltruc",
        icon: "🎩",
        dc: 11,
        flavor: "Een wachter doorzoekt je spullen grondig. Jij hebt iets bij je dat hij niet mag zien en hebt drie seconden om dat probleem op te lossen.",
        successText: "Terwijl zijn blik even wegdraait verplaats je het item naar een zak die hij al heeft doorzocht. Zijn tweede check vindt niets.",
        failText: "Je hand beweegt een fractie te vroeg. Zijn blik vangt de beweging en verandert van routine naar scherp.",
      },
    ],
  },
  mystery: {
    "Arcana": [
      {
        name: "Mindflayer fluistering",
        icon: "🦑",
        dc: 14,
        flavor: "De fluistering begint vaag maar wordt al snel luider dan je eigen innerlijke stem. \"Geef op... leg neer... het loont niet...\" De stem kent je twijfels.",
        successText: "Je vult je hoofd met bewuste ruis — kinderliedjes, willekeurige getallen. De stem heeft niets om aan vast te haken en verstilt woedend.",
        failText: "De stem vindt een zwakke plek en nestelt zich daarin. Je hoofd bonkt en je wacht een lange minuut tot het voorbijgaat.",
      },
    ],
    "Deception": [
      {
        name: "Trickster-brug",
        icon: "🌉",
        dc: 12,
        flavor: "Een kleine fey met een te brede glimlach bewaakt de enige brug. Hij wil een raadsel.",
        successText: "Je geeft hem een raadsel dat hij niet kan oplossen. Hij laat je door, knarsetandend.",
        failText: "Hij danst op je antwoord en verdwijnt met je muts.",
      },
    ],
    "History": [
      {
        name: "Verzonken bibliotheek",
        icon: "📚",
        dc: 13,
        flavor: "Rakken boeken, de helft verzopen en omgevallen. De overlevende paginas zijn gevlekt maar leesbaar. Ergens in dit archief ligt een antwoord.",
        successText: "In een waterbestendig leren map vind je een kaart met een route die geen enkel ander document vermeldt. Een verborgen doorgang, bewaard door toeval.",
        failText: "Drie boeken geven drie tegenstrijdige routes. Je kiest er een met zekerheid die je niet hebt en merkt na tien minuten dat je verkeerd zit.",
      },
      {
        name: "Veldslag van de Vergeten Koning",
        icon: "⚔️",
        dc: 13,
        flavor: "De vlakte is vreemd — te vlak, de aarde samengedrukt door dingen die er lang geleden overheen zijn getrokken. Gebroken pijlpunten, verroeste helmpanden. Dit was een slagveld.",
        successText: "Je herkent de klassieke verdedigingsformatie en zijn logische zwakke flank. Die flank is nog steeds de veiligste doorkruisingsroute, eeuwen later.",
        failText: "Je loopt recht in het kill-zone centrum van het slagveld. Magische restenergie trekkt aan je concentratie en kost je meer kracht dan je wilt missen.",
      },
      {
        name: "Gebroken kronieksteen",
        icon: "📜",
        dc: 12,
        flavor: "Een stenen plaquette in drie stukken gebroken, een inscriptie in Oud-Commonspell en Drakentaal. De tekst vertelt een half verhaal — de rest is verdwenen met het ontbrekende fragment.",
        successText: "Je herkent de schrijfstijl en vult de hiaten correct in. De route die de steen beschrijft onthult een doorgang die de meeste reizigers niet kennen.",
        failText: "Je vult de hiaten verkeerd in — logisch maar onjuist. De route die je volgt is de spiegelversie van de correcte.",
      },
      {
        name: "Oude handelsroute",
        icon: "🛤️",
        dc: 11,
        flavor: "Een vervallen kasseiweg duikt op naast het pad — breder, eens degelijker, nu begroeid. Handelsroutes van voor het Grote Zwijgen. Maar waar liep hij naartoe?",
        successText: "Je herkent het kasseipatroon als Zilverweg Gildecompagnie — hun routes liepen naar de zuidoostelijke handelsposten, precies jouw richting. Je versnelt.",
        failText: "De Zilverweg splitsde hier en jij neemt de verkeerde aftakking — naar een afgedankt distributiecentrum, nu ruines.",
      },
      {
        name: "Naam in steen",
        icon: "🪦",
        dc: 12,
        flavor: "Op een grafzerk staat een naam in kapitalen gebeiteld die iets triggert in je geheugen — niet de persoon, maar de reputatie. Een naam die ooit een waarschuwing was.",
        successText: "Je herinnert je de legende: hij markeerde zijn grafplek op de toegangsroute naar zijn val. De val ligt links. Je gaat rechts.",
        failText: "Je herkent de naam maar kunt er niet bij hoe hij relevant is. De val die je bijna activeert bevestigt dat je gelijk had te twijfelen.",
      },
      {
        name: "Verloren koninkrijk",
        icon: "🏰",
        dc: 14,
        flavor: "Muren die hier niet zouden mogen zijn — te hoog, te oud, van een constructiemethode die geen enkel levend gilde nog beheerst. Een rijk dat officieel nooit heeft bestaan.",
        successText: "Je herkent Pre-Cataclysm Elven Engineering en herinnert je: hun bouwwerken hebben altijd een geheime doorgang in de noordmuur. Precies waar de theorie hem voorschreef.",
        failText: "De combinatie van bekende en onbekende bouwstijlen desoriënteert je volledig. Je verliest twee keer je richting voor je een uitweg vindt.",
      },
      {
        name: "Oorlogsmonument",
        icon: "🗿",
        dc: 11,
        flavor: "Drie standbeelden kijken uit over een lege vlakte, elk wijzend in een andere richting. Onder elk een inscriptie in militair symbolenschrift. Dit was een navigatiepunt.",
        successText: "Het middelste standbeeld wijst de overwinningsroute — langs de verborgen toegang die jij zoekt. Je kiest correct.",
        failText: "Je neemt het linker standbeeld als navigatiepunt — dat was de terugtrekkingsroute. Je gaat de verkeerde kant op.",
      },
    ],
    "Insight": [
      {
        name: "Spiegeldubbelganger",
        icon: "🪞",
        dc: 12,
        flavor: "Je spiegelbeeld beweegt een tel te laat. Dan stapt het uit het glas — jouw ogen maar leeg, jouw glimlach maar een halve toon verkeerd.",
        successText: "Je omarmt je spiegelzelf — een vreemd maar juist instinct. Het verliest zijn vorm zonder iets om tegen te vechten en smelt terug in het glas.",
        failText: "Je dubbelganger wint het staren. Gedesoriënteerd door zijn perfecte nabootsing verlies je richting en tijdsbesef tegelijk.",
      },
    ],
    "Intimidation": [
      {
        name: "Schaduw-demon",
        icon: "🌑",
        dc: 13,
        flavor: "Je schaduw beweegt niet mee. Hij loopt van de wand af recht op je toe, groter dan hij zou moeten zijn, zijn ogen twee rode vonkjes.",
        successText: "\"Ik heb dingen gedaan die duisterder zijn dan jij.\" De demon herkent iets in de toon en wijkt terug naar de muur.",
        failText: "De schaduw grijpt je enkel — koud als dood, sterker dan een schaduw mag zijn. Angst versuft je benen en kostbare seconden gaan verloren.",
      },
    ],
    "Investigation": [
      {
        name: "Oude kluis",
        icon: "🔍",
        dc: 12,
        flavor: "Drie sloten van zwart smeedijzer, elk met een raadsel gegraveerd in een taal die je amper herkent. Fouten worden niet vergeven.",
        successText: "Bij het derde slot: een mechanisch klikken van correctheid. De deur schuift knarend open op een ruimte vol mogelijkheden.",
        failText: "Je derde antwoord was net iets te zeker uitgesproken. Alle drie sloten resetten. De kluis is geduldig.",
      },
      {
        name: "Geheime doorgang",
        icon: "🚪",
        dc: 11,
        flavor: "De muur klinkt hol als je er met je knokkel op klopt. De akoestiek is anders dan het omringende massieve steen — ergens is een mechanisme.",
        successText: "Achtste tik, subtiele resonantie. Je vindt de hendel, een steen verschuift en een verborgen gang opent zich voor je.",
        failText: "Je tikt de hele muur af tot je vingers pijn doen. Het mechanisme is er, je weet het zeker — maar je vindt de trigger niet.",
      },
      {
        name: "Verdachte sporen",
        icon: "🔍",
        dc: 12,
        flavor: "Verse sporen in een patroon dat niet klopt — te regelmatig, te bewust. Iemand was hier recent. De vraag is: met welke bedoeling?",
        successText: "Je analyseert de drukpunten en richting en herkent een markeerpatroon voor een valstrik. Je loopt er zorgvuldig omheen.",
        failText: "Je volgt de sporen met te veel vertrouwen. Ze leiden je in een nepleidingroute weg van je bestemming met professionele precisie.",
      },
      {
        name: "Echo-gang",
        icon: "🔊",
        dc: 11,
        flavor: "Je voetstappen komen terug van vóór je — te vroeg, te luid. De gang liegt over richting.",
        successText: "Je volgt het echte geluid van druppelwater, niet de echo. De juiste deur ligt links.",
        failText: "Je vertrouwt de echo en loopt terug naar waar je al was.",
      },
      {
        name: "Verloren tijd",
        icon: "⏳",
        dc: 11,
        flavor: "Volgens je geheugen ben je hier net aangekomen. Volgens de zon niet.",
        successText: "Je reconstrueert wat er gebeurd moet zijn.",
        failText: "Een uur ontbreekt. Je weet niet waarvan.",
      },
    ],
    "Medicine": [
      {
        name: "Far Realm infectie",
        icon: "👁️‍🗨️",
        dc: 14,
        flavor: "Een reiziger vertoont vreemde symptomen. De pupillen bewegen niet synchroon.",
        successText: "Je herkent de tekenen voordat de infectie zich verspreidt.",
        failText: "Je komt dichterbij dan verstandig was.",
      },
    ],
    "Nature": [
      {
        name: "Zwartwortel-netwerk",
        icon: "🌿",
        dc: 11,
        flavor: "Onder het mos ontdek je dikke zwarte wortels die pulseren als aders. Ze lopen allemaal dezelfde richting op.",
        successText: "Je volgt het patroon en leert waar de besmetting vandaan lijkt te komen.",
        failText: "Een wortel schiet omhoog en spuit zwart sap over je handen.",
      },
    ],
    "Perception": [
      {
        name: "Onzichtbare doorgang",
        icon: "🫥",
        dc: 12,
        flavor: "De gang eindigt in een blinde muur — maar de luchtcirculatie is verkeerd voor een echte doodlopende weg. Er is een tocht die niets verklaart.",
        successText: "Je volgt de tocht met je hand uitgestrekt. Waar hij het sterkst is, is de muur drie graden koeler. Je duwt — de steen verschuift.",
        failText: "Je tast de muur methodisch af maar mist de trigger door een centimeter in de verkeerde richting. De doodlopende gang wint deze ronde.",
      },
    ],
    "Religion": [
      {
        name: "Vervallen altaar",
        icon: "⛪",
        dc: 10,
        flavor: "Een altaar van gebarsten zwart marmer, zijn oorspronkelijke devotie verdrongen door iets donkerders. De energiemist eromheen is nog actief.",
        successText: "Een oprecht gebed in de correcte liturgische vorm. Het altaar suist en de mist trekt langzaam terug. Je passeert ongedeerd.",
        failText: "De donkere energie springt op je af als een beet. Een kou in je botten die niet wegwil en benen die even niet gehoorzamen.",
      },
      {
        name: "Spookachtige kerkers",
        icon: "👻",
        dc: 11,
        flavor: "Koude adem op je nek, fluisterende stemmen net buiten je begrip, kaarsjes die doven als je kijkt. De kerker is bezet door meer dan de levenden.",
        successText: "Een oprechte zegen, de woorden net goed genoeg. De kou wijkt centimeter voor centimeter en de geesten trekken zich terug.",
        failText: "De geesten herkennen de twijfel in je uitvoering en exploiteren die vakkundig. Je rent meer dan je loopt.",
      },
      {
        name: "Fluisterende crypte",
        icon: "🪦",
        dc: 10,
        flavor: "Onder een grafsteen hoor je iets fluisteren. Geen woorden — gevoelens. Angst. Honger.",
        successText: "Je herkent het als een gebonden geest en spreekt de ontbindingsritus uit.",
        failText: "De fluistering kruipt in je hoofd. Je rent voordat je nadenkt.",
      },
    ],
    "Survival": [
      {
        name: "Drie paden",
        icon: "🛣️",
        dc: 0,
        flavor: "Een splitsing zonder bordje. Links open terrein — snel maar zichtbaar. Rechts langs een beekje — veilig maar omslachtig. Midden een donker woud dat niets prijsgeeft.",
        successText: "Je leest het terrein en de lichtkant van de bomen en kiest de route die meewerkt. Je keuze levert tijdwinst op.",
        failText: "Je keuze had logica maar miste context. Een obstakel dat je niet kon weten kost je tijd en een omweg.",
      },
    ],
    "Wisdom": [
      {
        name: "Beholder-droom",
        icon: "👁️",
        dc: 14,
        flavor: "Paarse mist vult de gang in seconden. Dan zijn er ogen — tientallen, overal, stuk voor stuk starend met onsterfelijke aandacht.",
        successText: "Je knijpt hard in je arm. De pijn is echt, de mist is dat niet. Je loopt erdoorheen als een geest en de illusie scheurt achter je.",
        failText: "De ogen vinden iets in jou dat ze vasthouden. Voor vijf lange minuten kun je geen stap in welke richting dan ook zetten.",
      },
    ],
  },
  wild: {
    "Animal Handling": [
      {
        name: "Owlbear-nest",
        icon: "🦉",
        dc: 12,
        flavor: "De geur van veren en roofdier. Dan zie je Mama Owlbear, haar kuikens achter haar, haar ogen gefixeerd op jou met de blik van een moeder die niet vraagt.",
        successText: "Je houdt een vis omhoog die je al twee dagen bij je droeg voor precies dit moment. Ze snuift, kijkt lang, pakt de vis. Vrede gesloten.",
        failText: "SKREE! Het geluid treft je trommelvliezen als een klap. Klauwen scheren door je mantel. Je ontsnapt, maar nipt.",
      },
      {
        name: "Vreemde wilde beesten",
        icon: "🐺",
        dc: 12,
        flavor: "Een groep normaal vreedzame dieren staat in een gespannen kring midden op het pad, hun lichaamstaal agressief op een volkomen onnatuurlijke manier.",
        successText: "Je spreekt zacht, verlaagt je houding en stuurt geruststellende signalen. De kring lost op en ze trekken zich terug. Je passeert ongehinderd.",
        failText: "Een beweging was genoeg. De dieren raken in collectieve paniek en storten in alle richtingen. Je wacht tot de chaos voorbij is.",
      },
    ],
    "Athletics": [
      {
        name: "Zandvallei",
        icon: "🏜️",
        dc: 11,
        flavor: "Een depressie gevuld met fijn droog zand dat gedraagt als drijfzand in slow motion. Elke stap zinkt weg, beweging kost hier driemaal de normale energie.",
        successText: "Brede schuifstappen die het oppervlak gebruiken in plaats van er doorheen te zakken. Langzamer, maar zonder vastzitten.",
        failText: "Je zakt bij de derde stap tot aan je enkels weg en het zand vult het gat onmiddellijk. Tien minuten en meer energie dan een gevecht om los te komen.",
      },
    ],
    "Nature": [
      {
        name: "Giftige flora",
        icon: "🌿",
        dc: 12,
        flavor: "De plantengroei is onnatuurlijk — te groen, te dicht, draaiend in een richting die niet met het licht overeenkomt. Ze bewegen iets te bewust.",
        successText: "Je herkent Tanglebriar en Scorchweed en navigeert langs de niet-groeiende zones. Veilig door, zonder aanraking.",
        failText: "Je schouder raakt een tak en de plant reageert direct. Ranken grijpen je mouw en zaadpods barsten open in je gezicht. Je trekt je vrij, beschadigd.",
      },
    ],
    "Stealth": [
      {
        name: "Schaduwrijk pad",
        icon: "🌑",
        dc: 13,
        flavor: "Een wachtpatrouille schuift door de verte, hun fakkels oranje vlekken in de nacht. Tussen jou en je bestemming: open terrein in maanlicht.",
        successText: "Je beweegt als een schaduw tussen schaduwen — langzaam, laag, adem gecontroleerd. De patrouille passeert op vijf meter en kijkt nooit.",
        failText: "Een tak breekt onder je voet. De patrouille draait om, fakkels omhoog. Je moet terugtrekken en een omweg nemen.",
      },
      {
        name: "Ork-marskolonne",
        icon: "🥁",
        dc: 10,
        flavor: "Tromgeroffel nadert. Een ork-marskolonne van zes man doorkruist jouw pad — je moet ongezien blijven.",
        successText: "Je drukt je plat tegen de rotsen — ze marcheren voorbij.",
        failText: "Een ork trapt op een tak. Ze draaien zich om.",
      },
    ],
    "Survival": [
      {
        name: "Betoverd woud",
        icon: "🌲",
        dc: 11,
        flavor: "De bomen bewegen niet met de wind maar met je passen. Het pad was hier een moment geleden — nu niet meer.",
        successText: "Je legt je hand op een bemoste steen, vindt het zuiden via de koude zijde, en het woud laat je door zonder protest.",
        failText: "Een half uur later passeer je dezelfde steen voor de tweede keer. Het woud heeft je in perfecte cirkels geleid.",
      },
      {
        name: "Onherbergzaam terrein",
        icon: "⛰️",
        dc: 13,
        flavor: "Het terrein verandert abrupt naar vijandig — scherpe rotsranden, instabiele grond en een wind fel genoeg om je richting te verstoren.",
        successText: "Je leest het terrein als een kaart en kiest de route die ermee meebeweegt in plaats van ertegen. Aan de andere kant, intact.",
        failText: "Je kiest de directe route en het landschap bestraft die keus. Je beklimt dezelfde rotswand tweemaal voor je de fout doorhebt.",
      },
      {
        name: "Verdwaald kompas",
        icon: "🧭",
        dc: 12,
        flavor: "Je kompas draait in cirkels, zijn naald trillend en onbetrouwbaar. Geen zon, geen sterren. En de weg die je net hebt genomen ziet er identiek uit van de andere kant.",
        successText: "Je negeert het kompas en gebruikt de bemoste stenen en het lichthoek door de bomen. Oriëntatie hersteld, je vervolgt met vertrouwen.",
        failText: "Je gaat op gevoel en je gevoel laat je stikken. Je loopt in cirkels voor je beseft wat er aan de hand is.",
      },
      {
        name: "Jachtsporen",
        icon: "🐾",
        dc: 11,
        flavor: "Verse sporen in de zachte modder — groot, diep, recent. Ze zijn er meerdere, overlappend. Ergens voor je beweegt iets in dezelfde richting.",
        successText: "De nagelverdeling en staplengte: planteneters, een groep herten. Herten kennen de veilige routes. Je volgt hun pad.",
        failText: "Je leest de sporen verkeerd — dit zijn roofdieren. Je route brengt je recht naar hun rustplek. Omweg vereist.",
      },
      {
        name: "Giftige mist",
        icon: "🌫️",
        dc: 13,
        flavor: "Geel-groenige lucht, zwaar van rotte eieren en hete koper. Giftige miasma uit een vulkanische spleet of een alchemische ramp van lang geleden.",
        successText: "Miasma volgt de laagste punten — je kiest een hogere route langs de rand waar de lucht schoon blijft en passeert droog.",
        failText: "Je onderschat de omvang van de mistzone en zoekt lang naar de grens. Je bereikt schone lucht, maar uitgeput.",
      },
      {
        name: "Ghoul-krypt",
        icon: "🦴",
        dc: 12,
        flavor: "Uit open graven kruipen ghouls — sneller dan zombies, hongeriger dan de levenden. Ze delen hun maaltijd niet.",
        successText: "Je vindt een hogere richel en springt van graf naar graf tot je buiten hun bereik bent.",
        failText: "Een ghoul grijpt je enkel. Je trekt los met vlees en tijd als prijs.",
      },
      {
        name: "Cockatrice-roost",
        icon: "🐓",
        dc: 11,
        flavor: "Versteende ratten en vogels liggen rond een nest van glasachtige eieren. De moeder zit er nog.",
        successText: "Je blijft in haar dode hoek en sluipt langs de muur — ze merkt je niet.",
        failText: "Je schoen kraakt op steen. Haar kop draait. Je verstijft net niet op tijd.",
      },
      {
        name: "Zwart sap",
        icon: "🩸",
        dc: 10,
        flavor: "Een beekje voert donker sap mee. Dieren vermijden de plek zichtbaar.",
        successText: "Je vindt een veilige route langs de besmetting.",
        failText: "Je stapt in het sap en voelt een koude steek door je been trekken.",
      },
    ],
  },
  fey: {
    "Insight": [
      {
        name: "Dansende lichtjes",
        icon: "✨",
        dc: 10,
        flavor: "Wisp-achtige lichtjes leiden je van het pad. Ze zijn prachtig. Ze willen iets van je.",
        successText: "Je herkent de misleiding en volgt de schaduw terug naar het pad.",
        failText: "Je volgt ze een uur lang voordat je merkt dat je in cirkels loopt.",
      },
      {
        name: "Pixie-belofte",
        icon: "📜",
        dc: 11,
        flavor: "Een pixie biedt een blad-contract aan: één gunst nu, één gunst later. De inkt glinstert als dauw.",
        successText: "Je leest de clausule over je ware naam en weigert. Ze fluit en verdwijnt zonder wrok.",
        failText: "Je belooft een gunst zonder te weten wanneer ze die opeist.",
      },
    ],
    "Performance": [
      {
        name: "Pixie-kring",
        icon: "🧚",
        dc: 9,
        flavor: "Een kring van gloeiende paddenstoelen, drie pixies erboven. \"DANS!\" piepen ze in koor, hun ogen glinsteren van ondeugende hoop.",
        successText: "Je zet een uitbundige jig in — lelijk maar oprecht. De pixies juichen en duwen je een stap verder vooruit.",
        failText: "Je ploft in de modder als een zak havermout. De pixies schateren het uit.",
      },
      {
        name: "Sirene-lied",
        icon: "🧜",
        dc: 12,
        flavor: "Een stem zo perfect van toon dat elke noot een fysieke pijn in je borst veroorzaakt. De melodie trekt aan je enkels als een eb-getij.",
        successText: "Je zingt een hard dissonant tegenlied — opzettelijk lelijk, bewust uit de maat. De harmonie breekt. De sirene kijkt verbaasd.",
        failText: "De melodie vult je hoofd volledig. Je staat bij het water zonder te weten hoe je er bent gekomen. Het kost minuten om jezelf te rijgen.",
      },
    ],
  },
  loot: {
    "Investigation": [
      {
        name: "Gnomish uitvinding",
        icon: "⚙️",
        dc: 11,
        flavor: "Op een werkbank: een apparaat van koper en tandwielen met een label dat zegt \"SPRINT-O-MATIC 3000 — Niet in kleine ruimtes gebruiken.\"",
        successText: "BOEM — een golf stoom en mechanische energie stuwt je precies de richting in die je wilt. Tien stappen vooruit voordat je weet wat er gebeurt.",
        failText: "De rook treft direct je gezicht. Je hoest, wuift, staat uiteindelijk op exact dezelfde plek — alleen je haar ziet er anders uit.",
      },
      {
        name: "Grafkelder",
        icon: "⚰️",
        dc: 10,
        flavor: "Een kelder vol open kisten en gestolen wapenrusting. Geen altaar — alleen dieven en wat ze achterlieten.",
        successText: "Je vindt een kaart in een lege helm. De route bestaat nergens anders op.",
        failText: "Je stapt op een vals deksel. De val is oud, maar nog steeds scherp.",
      },
      {
        name: "De Knoop",
        icon: "🌳",
        dc: 13,
        flavor: "Een boom lijkt dood, tot je ontdekt dat de stam hol is. Binnen klopt iets als een hart.",
        successText: "Je vernietigt de knoop en vindt iets dat het beschermde.",
        failText: "De boom opent zich. Jij stond te dichtbij.",
      },
    ],
    "Medicine": [
      {
        name: "Healing potion",
        icon: "🧪",
        dc: 9,
        flavor: "Een flesje op een richel, gloeiend amberkleurig. Een briefje ernaast: \"Neem me\" — tegelijk uitnodigend en ongemakkelijk ernstig.",
        successText: "Je snuift aan de kurk — basilicum, lavendel, genezingsmagie. Je drinkt en voelt de warmte naar je ledematen vloeien.",
        failText: "De kleur was bijna goed. Bijna. Je staat een pijnlijke minuut te wankelen terwijl je lichaam beslist wat het doet met de inhoud.",
      },
      {
        name: "Potion-roulette",
        icon: "🧫",
        dc: 10,
        flavor: "Zeven flessen in een rij, elk een andere kleur. Een ruikt naar genezing. De andere zes naar avontuur van de soort die je liever vermijdt.",
        successText: "Je sluit je ogen, snuift aan de amberkleurige fles. Appel en genezingsmagie. Juiste keuze, goed instinct.",
        failText: "De paarse fles leek logisch. Dat was het niet. Je tong wordt blauw en de gang draait vrolijk rond.",
      },
    ],
    "Nature": [
      {
        name: "Eetbare flora",
        icon: "🍃",
        dc: 10,
        flavor: "Langs het pad groeien bessen, wortels en bladeren — potentieel eetbaar en potentieel dodelijk, soms haast identiek aan elkaar. Je proviand is laag.",
        successText: "Je herkent de smalle bladeren van wilde Moongreens aan de tint van de nerf. Je loopt sterker verder dan je begon.",
        failText: "De bladeren waren haast identiek maar de geur had het moeten vertellen. Je maag protesteert het volgende uur.",
      },
    ],
    "Perception": [
      {
        name: "Geplunderd kamp",
        icon: "🔥",
        dc: 9,
        flavor: "Rook hangt laag. Een ork-kamp, nog warm. Ergens tussen de rommel ligt iets waardevols.",
        successText: "Je vindt een zakje munten en een verborgen wapenrek.",
        failText: "Je graait in het duister — en grijpt een valkuil.",
      },
    ],
    "Perception OR Investigation": [
      {
        name: "Val of beloning",
        icon: "🎲",
        dc: 12,
        flavor: "Een voorwerp van duidelijke waarde ligt midden op het pad — te prominent om toevallig te zijn. Verloren bezit of lokvink voor een val?",
        successText: "Je analyseert de omgeving voor je reikt. Valstrik of niet — je kiest verstandig en gaat verder rijker of ongedeerd.",
        failText: "Je kiest verkeerd. De val was er of de voorzichtigheid was overdreven. Beide kosten je iets.",
      },
    ],
    "Religion": [
      {
        name: "Zegening-fontein",
        icon: "⛲",
        dc: 9,
        flavor: "Een kleine fontein in een nis, het water kristalhelder, een eeuwig kaarsje erboven. Een engelenbeeldje kijkt neer met serene, tijdloze vreugde.",
        successText: "Het water is koud, vers en laat een aangename tinteling achter. De goden hebben dit gezegend, en die zegen stroomt mee in je stap.",
        failText: "Te zoet, dan te bitter, dan iets vreemds. Je hoest het grotendeels uit en loopt briesend door.",
      },
    ],
    "Sleight of Hand": [
      {
        name: "Verborgen zak",
        icon: "👝",
        dc: 10,
        flavor: "Een handelaar staat te stil bij een kraampje met te weinig waar. Zijn binnenzak bulkt ongewoon en zijn ogen volgen voorbijgangers te aandachtig.",
        successText: "In de halve seconde dat zijn blik wegdraait glijdt jouw hand naar zijn binnenzak. Een kaart en een zakje nuttige inhoud. Je loopt door.",
        failText: "Hij voelt je vingers net vroeg genoeg. Zijn hand grijpt je pols, niet hard maar vast genoeg om het punt te maken.",
      },
    ],
  },
};

const EVENT_POOL = flattenEventPool(EVENT_POOL_RAW).map(enrichCombatEvent);


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
const AMBUSH_POOL = EVENT_POOL.filter((e) => e.category === 'ambush');

function getDefaultBoss() {
  return EVENT_POOL.find((e) => e.name === GUARDIAN_EVENT_NAME) || BOSS_POOL[0] || EVENT_POOL[0];
}

function pickRandomBoss() {
  if (BOSS_POOL.length === 0) return getDefaultBoss();
  return BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)];
}

function eventsExceptBosses() {
  return EVENT_POOL.filter((e) => e.category !== 'boss' && e.category !== 'ambush');
}

function pickRandomAmbush() {
  if (AMBUSH_POOL.length === 0) return null;
  return AMBUSH_POOL[Math.floor(Math.random() * AMBUSH_POOL.length)];
}

function pickRandomPath() {
  if (PATH_TILES.length === 0) {
    return { name: 'Rustig pad', icon: '🚶', flavor: 'Even ademhalen onderweg.' };
  }
  return PATH_TILES[Math.floor(Math.random() * PATH_TILES.length)];
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
  spaces[HEALER_SPACE] = { type: 'healer', ...HEALER_TILE };

  const playable = [];
  for (let n = 2; n <= 61; n += 1) {
    if (n !== HEALER_SPACE) playable.push(n);
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

  const eventSlotNums = [];
  for (let n = 2; n <= 61; n += 1) {
    if (n !== HEALER_SPACE && spaces[n]?.type === 'event') {
      eventSlotNums.push(n);
    }
  }

  const ambushCount = Math.max(
    1,
    Math.min(Math.round(eventSlotNums.length * AMBUSH_RATIO), eventSlotNums.length),
  );
  const mysterySlots = shuffleArray(eventSlotNums).slice(0, ambushCount);
  mysterySlots.forEach((slot) => {
    spaces[slot] = {
      type: 'mystery',
      category: 'mystery',
      icon: '❓',
      name: 'Onbekend gevaar',
      flavor: 'Iets loert hier. Je weet nog niet wat.',
    };
  });

  return spaces;
}

let SPECIAL_SPACES = buildSpecialSpaces();

function rebuildBoard() {
  SPECIAL_SPACES = buildSpecialSpaces();
  window.SPECIAL_SPACES = SPECIAL_SPACES;
  return SPECIAL_SPACES;
}

function applySpecialSpaces(spaces) {
  SPECIAL_SPACES = spaces;
  window.SPECIAL_SPACES = spaces;
}

window.SPECIAL_SPACES = SPECIAL_SPACES;
window.applySpecialSpaces = applySpecialSpaces;
window.EVENT_POOL = EVENT_POOL;
window.BOSS_POOL = BOSS_POOL;
window.AMBUSH_POOL = AMBUSH_POOL;
window.AMBUSH_RATIO = AMBUSH_RATIO;
window.pickRandomAmbush = pickRandomAmbush;
window.pickRandomPath = pickRandomPath;
window.PATH_TILES = PATH_TILES;
window.HEALER_SPACE = HEALER_SPACE;
window.HEALER_TILE = HEALER_TILE;
window.ENCAMPMENT_SPACE = ENCAMPMENT_SPACE;
window.ENCAMPMENT_TILE = ENCAMPMENT_TILE;
window.getDefaultBoss = getDefaultBoss;
window.pickRandomBoss = pickRandomBoss;
window.rebuildBoard = rebuildBoard;
window.buildSpecialSpaces = buildSpecialSpaces;
