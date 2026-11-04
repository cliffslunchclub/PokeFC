/* Gen 1 species and types. No external API calls or image dependencies. */
const POKEDEX_CSV = `
1|Bulbasaur|grass|poison
2|Ivysaur|grass|poison
3|Venusaur|grass|poison
4|Charmander|fire|
5|Charmeleon|fire|
6|Charizard|fire|flying
7|Squirtle|water|
8|Wartortle|water|
9|Blastoise|water|
10|Caterpie|bug|
11|Metapod|bug|
12|Butterfree|bug|flying
13|Weedle|bug|poison
14|Kakuna|bug|poison
15|Beedrill|bug|poison
16|Pidgey|normal|flying
17|Pidgeotto|normal|flying
18|Pidgeot|normal|flying
19|Rattata|normal|
20|Raticate|normal|
21|Spearow|normal|flying
22|Fearow|normal|flying
23|Ekans|poison|
24|Arbok|poison|
25|Pikachu|electric|
26|Raichu|electric|
27|Sandshrew|ground|
28|Sandslash|ground|
29|Nidoran♀|poison|
30|Nidorina|poison|
31|Nidoqueen|poison|ground
32|Nidoran♂|poison|
33|Nidorino|poison|
34|Nidoking|poison|ground
35|Clefairy|fairy|
36|Clefable|fairy|
37|Vulpix|fire|
38|Ninetales|fire|
39|Jigglypuff|normal|fairy
40|Wigglytuff|normal|fairy
41|Zubat|poison|flying
42|Golbat|poison|flying
43|Oddish|grass|poison
44|Gloom|grass|poison
45|Vileplume|grass|poison
46|Paras|bug|grass
47|Parasect|bug|grass
48|Venonat|bug|poison
49|Venomoth|bug|poison
50|Diglett|ground|
51|Dugtrio|ground|
52|Meowth|normal|
53|Persian|normal|
54|Psyduck|water|
55|Golduck|water|
56|Mankey|fighting|
57|Primeape|fighting|
58|Growlithe|fire|
59|Arcanine|fire|
60|Poliwag|water|
61|Poliwhirl|water|
62|Poliwrath|water|fighting
63|Abra|psychic|
64|Kadabra|psychic|
65|Alakazam|psychic|
66|Machop|fighting|
67|Machoke|fighting|
68|Machamp|fighting|
69|Bellsprout|grass|poison
70|Weepinbell|grass|poison
71|Victreebel|grass|poison
72|Tentacool|water|poison
73|Tentacruel|water|poison
74|Geodude|rock|ground
75|Graveler|rock|ground
76|Golem|rock|ground
77|Ponyta|fire|
78|Rapidash|fire|
79|Slowpoke|water|psychic
80|Slowbro|water|psychic
81|Magnemite|electric|steel
82|Magneton|electric|steel
83|Farfetch'd|normal|flying
84|Doduo|normal|flying
85|Dodrio|normal|flying
86|Seel|water|
87|Dewgong|water|ice
88|Grimer|poison|
89|Muk|poison|
90|Shellder|water|
91|Cloyster|water|ice
92|Gastly|ghost|poison
93|Haunter|ghost|poison
94|Gengar|ghost|poison
95|Onix|rock|ground
96|Drowzee|psychic|
97|Hypno|psychic|
98|Krabby|water|
99|Kingler|water|
100|Voltorb|electric|
101|Electrode|electric|
102|Exeggcute|grass|psychic
103|Exeggutor|grass|psychic
104|Cubone|ground|
105|Marowak|ground|
106|Hitmonlee|fighting|
107|Hitmonchan|fighting|
108|Lickitung|normal|
109|Koffing|poison|
110|Weezing|poison|
111|Rhyhorn|ground|rock
112|Rhydon|ground|rock
113|Chansey|normal|
114|Tangela|grass|
115|Kangaskhan|normal|
116|Horsea|water|
117|Seadra|water|
118|Goldeen|water|
119|Seaking|water|
120|Staryu|water|
121|Starmie|water|psychic
122|Mr. Mime|psychic|fairy
123|Scyther|bug|flying
124|Jynx|ice|psychic
125|Electabuzz|electric|
126|Magmar|fire|
127|Pinsir|bug|
128|Tauros|normal|
129|Magikarp|water|
130|Gyarados|water|flying
131|Lapras|water|ice
132|Ditto|normal|
133|Eevee|normal|
134|Vaporeon|water|
135|Jolteon|electric|
136|Flareon|fire|
137|Porygon|normal|
138|Omanyte|rock|water
139|Omastar|rock|water
140|Kabuto|rock|water
141|Kabutops|rock|water
142|Aerodactyl|rock|flying
143|Snorlax|normal|
144|Articuno|ice|flying
145|Zapdos|electric|flying
146|Moltres|fire|flying
147|Dratini|dragon|
148|Dragonair|dragon|
149|Dragonite|dragon|flying
150|Mewtwo|psychic|
151|Mew|psychic|
`;
const TYPE_INFO = {
 normal:['#8e988b','●'],fire:['#fb754b','✦'],water:['#4ebde6','≈'],electric:['#f7ce57','ϟ'],grass:['#6fca8a','❀'],ice:['#7cd5d6','❄'],fighting:['#df7967','✊'],poison:['#b886d9','◆'],ground:['#cda978','▰'],flying:['#8eaee1','➤'],psychic:['#ed80bd','✳'],bug:['#aace5a','⬡'],rock:['#c8b68a','⬟'],ghost:['#8d81ca','☾'],dragon:['#8596fa','♜'],steel:['#96a9b6','⬢'],fairy:['#f6afd9','✧']
};
/* Canonical modern base stats: HP, Attack, Defense, Special Attack, Special Defense, Speed.
   Sourced from PokéAPI/pokeapi data/v2/csv/pokemon_stats.csv, Gen I default forms (IDs 1–151).
   Offline snapshot; no remote API requests at runtime. */
const GEN1_BASE_STATS = `45,49,49,65,65,45;60,62,63,80,80,60;80,82,83,100,100,80;39,52,43,60,50,65;58,64,58,80,65,80;78,84,78,109,85,100;44,48,65,50,64,43;59,63,80,65,80,58;79,83,100,85,105,78;45,30,35,20,20,45;50,20,55,25,25,30;60,45,50,90,80,70;
40,35,30,20,20,50;45,25,50,25,25,35;65,90,40,45,80,75;40,45,40,35,35,56;63,60,55,50,50,71;83,80,75,70,70,101;30,56,35,25,35,72;55,81,60,50,70,97;40,60,30,31,31,70;65,90,65,61,61,100;35,60,44,40,54,55;60,95,69,65,79,80;
35,55,40,50,50,90;60,90,55,90,80,110;50,75,85,20,30,40;75,100,110,45,55,65;55,47,52,40,40,41;70,62,67,55,55,56;90,92,87,75,85,76;46,57,40,40,40,50;61,72,57,55,55,65;81,102,77,85,75,85;70,45,48,60,65,35;95,70,73,95,90,60;
38,41,40,50,65,65;73,76,75,81,100,100;115,45,20,45,25,20;140,70,45,85,50,45;40,45,35,30,40,55;75,80,70,65,75,90;45,50,55,75,65,30;60,65,70,85,75,40;75,80,85,110,90,50;35,70,55,45,55,25;60,95,80,60,80,30;60,55,50,40,55,45;
70,65,60,90,75,90;10,55,25,35,45,95;35,100,50,50,70,120;40,45,35,40,40,90;65,70,60,65,65,115;50,52,48,65,50,55;80,82,78,95,80,85;40,80,35,35,45,70;65,105,60,60,70,95;55,70,45,70,50,60;90,110,80,100,80,95;40,50,40,40,40,90;
65,65,65,50,50,90;90,95,95,70,90,70;25,20,15,105,55,90;40,35,30,120,70,105;55,50,45,135,95,120;70,80,50,35,35,35;80,100,70,50,60,45;90,130,80,65,85,55;50,75,35,70,30,40;65,90,50,85,45,55;80,105,65,100,70,70;40,40,35,50,100,70;
80,70,65,80,120,100;40,80,100,30,30,20;55,95,115,45,45,35;80,120,130,55,65,45;50,85,55,65,65,90;65,100,70,80,80,105;90,65,65,40,40,15;95,75,110,100,80,30;25,35,70,95,55,45;50,60,95,120,70,70;52,90,55,58,62,60;35,85,45,35,35,75;
60,110,70,60,60,110;65,45,55,45,70,45;90,70,80,70,95,70;80,80,50,40,50,25;105,105,75,65,100,50;30,65,100,45,25,40;50,95,180,85,45,70;30,35,30,100,35,80;45,50,45,115,55,95;60,65,60,130,75,110;35,45,160,30,45,70;60,48,45,43,90,42;
85,73,70,73,115,67;30,105,90,25,25,50;55,130,115,50,50,75;40,30,50,55,55,100;60,50,70,80,80,150;60,40,80,60,45,40;95,95,85,125,75,55;50,50,95,40,50,35;60,80,110,50,80,45;50,120,53,35,110,87;50,105,79,35,110,76;90,55,75,60,75,30;
40,65,95,60,45,35;65,90,120,85,70,60;80,85,95,30,30,25;105,130,120,45,45,40;250,5,5,35,105,50;65,55,115,100,40,60;105,95,80,40,80,90;30,40,70,70,25,60;55,65,95,95,45,85;45,67,60,35,50,63;80,92,65,65,80,68;30,45,55,70,55,85;
60,75,85,100,85,115;40,45,65,100,120,90;70,110,80,55,80,105;65,50,35,115,95,95;65,83,57,95,85,105;65,95,57,100,85,93;65,125,100,55,70,85;75,100,95,40,70,110;20,10,55,15,20,80;95,125,79,60,100,81;130,85,80,85,95,60;48,48,48,48,48,48;
55,55,50,45,65,55;130,65,60,110,95,65;65,65,60,110,95,130;65,130,60,95,110,65;65,60,70,85,75,40;35,40,100,90,55,35;70,60,125,115,70,55;30,80,90,55,45,55;60,115,105,65,70,80;80,105,65,60,75,130;160,110,65,65,110,30;90,85,100,95,125,85;
90,90,85,125,90,100;90,100,90,125,85,90;41,64,45,50,50,50;61,84,65,70,70,70;91,134,95,100,100,80;106,110,90,154,90,130;100,100,100,100,100,100`.replace(/\s+/g,'').split(';').map(s=>s.split(',').map(Number));
if (GEN1_BASE_STATS.length !== 151 || GEN1_BASE_STATS.some(a=>a.length!==6 || a.some(n=>!Number.isFinite(n)))) throw new Error('Pokémon stat database invalid');
/* Ordered as PAC, SHO, PAS, DRI, DEF, PHY. Small type-flavor bonuses are
   deliberately bounded so the real base stats remain the main influence. */
const SOCCER_TYPE_BONUS = {
 normal:[0,0,0,0,0,0],fire:[1,3,-1,1,-1,-1],water:[-1,0,3,0,2,2],
 electric:[4,0,2,3,-1,-2],grass:[0,0,2,1,1,1],ice:[-1,1,1,0,2,0],
 fighting:[1,3,-1,0,1,4],poison:[0,0,0,2,1,0],ground:[-2,1,-1,-1,3,3],
 flying:[3,0,1,2,-2,-1],psychic:[0,1,4,3,0,-2],bug:[2,0,0,1,0,-1],
 rock:[-3,1,-2,-2,4,4],ghost:[2,1,2,4,-2,-3],dragon:[1,3,2,0,2,2],
 steel:[-2,0,1,-1,4,3],fairy:[1,1,3,1,1,-1]
};
const LEGENDARY = new Set([144,145,146,150,151]);
const ATTR_KEYS = ['pac','sho','pas','dri','def','phy'];
const POKEMON = POKEDEX_CSV.trim().split('\n').map(line=>{
  const [idS,name,primary,secondary] = line.split('|');
  const id=Number(idS), types=[primary,secondary].filter(Boolean);
  const [hp,attack,defense,spAttack,spDefense,speed]=GEN1_BASE_STATS[id-1];
  const baseStats={hp,attack,defense,spAttack,spDefense,speed};
  const blended=[
    .80*speed+.13*attack+.07*hp,                             // pace
    .45*attack+.40*spAttack+.15*speed,                       // shooting
    .43*spAttack+.31*spDefense+.17*speed+.09*defense,        // passing
    .40*speed+.35*spAttack+.15*spDefense+.10*attack,         // dribbling
    .54*defense+.27*spDefense+.10*attack+.09*hp,             // defending
    .30*hp+.35*attack+.25*defense+.10*spDefense              // physicality
  ];
  const p={id,name,types,legendary:LEGENDARY.has(id),baseStats,baseTotal:hp+attack+defense+spAttack+spDefense+speed};
  ATTR_KEYS.forEach((key,i)=>{
    const first=(SOCCER_TYPE_BONUS[primary]||SOCCER_TYPE_BONUS.normal)[i];
    const second=secondary?(SOCCER_TYPE_BONUS[secondary]||SOCCER_TYPE_BONUS.normal)[i]*.5:0;
    p[key]=Math.max(30,Math.min(98,Math.round(30+.48*Math.min(160,blended[i])+first+second)));
  });
  // Compatibility aliases for earlier versions of the standalone arcade mode
  // and saved franchises. Goalkeepers use exactly the same six attributes.
  p.pace=p.pac;p.shot=p.sho;p.pass=p.pas;p.defense=p.def;p.physical=p.phy;
  p.keeper=Math.round(.10*p.pac+.05*p.sho+.10*p.pas+.10*p.dri+.40*p.def+.25*p.phy);
  return p;
});
