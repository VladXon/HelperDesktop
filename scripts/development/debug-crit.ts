import { readFileSync } from 'fs';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';
import { findActiveSkillGroup, findMainGem, findWeaponBaseType, getSkillBaseData, getWeaponBaseData } from '../packages/poe-data/src/pob/skill-converter.ts';

const FILES = [
  'OKKGxj0iff7j_Witch_Occultist_L97.pob.xml',
  'a9IXV_SNxQHe_Duelist_Slayer_L100.pob.xml',
  'B6eQgQiqRHf3_Ranger_Pathfinder_L90.pob.xml',
  '4x0Dm0JKmdpx_Witch_Occultist_L97.pob.xml',
  'tbN_O9rderTG_Duelist_Slayer_L100.pob.xml',
];

for (const fname of FILES) {
  const xml = readFileSync(`../test-data/pobb-builds/${fname}`, 'utf-8');
  const dto = parsePobXml(xml);
  const buildId = fname.split('_')[0];

  console.log(`\n=== ${buildId} ===`);
  
  const activeGroup = findActiveSkillGroup(dto);
  const mainGem = activeGroup ? findMainGem(activeGroup) : undefined;
  console.log(`Main gem: ${mainGem?.nameSpec} (skillId: ${mainGem?.skillId})`);
  
  const skillData = mainGem ? getSkillBaseData(mainGem.nameSpec) : undefined;
  console.log(`Skill data: ${skillData ? JSON.stringify(skillData) : 'NOT FOUND'}`);
  
  const weaponBaseType = findWeaponBaseType(dto);
  console.log(`Weapon base type: ${weaponBaseType}`);
  
  const weaponData = weaponBaseType ? getWeaponBaseData(weaponBaseType) : undefined;
  console.log(`Weapon data: ${weaponData ? JSON.stringify(weaponData) : 'NOT FOUND'}`);
}