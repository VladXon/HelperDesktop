local buildPath = arg and arg[1]
if not buildPath then io.stderr:write("Usage: luajit pob-ref.lua <path_to_build_xml>\n") os.exit(1) end

local origPrint = print
print = function() end
dofile("HeadlessWrapper.lua")
print = origPrint

local f = io.open(buildPath, "r")
local xmlText = f:read("*all")
f:close()

print = function() end
loadBuildFromXML(xmlText, "Test Build")
for _ = 1, 10 do runCallback("OnFrame") end
print = origPrint

build.calcsTab:BuildOutput()

local mo = build.calcsTab.mainOutput
local classInfo = {}
if build.spec then
  classInfo.className = build.spec.curClassName
  classInfo.ascendClassName = build.spec.curAscendClassName
  classInfo.ascendClassId = build.spec.curAscendClassId
end

local out = {
  buildName = build.buildName,
  className = classInfo.className,
  ascendClassName = classInfo.ascendClassName,
  characterLevel = build.characterLevel,
  targetVersion = build.targetVersion,
  stats = {
    Life = mo.Life,
    EnergyShield = mo.EnergyShield,
    Armour = mo.Armour,
    Evasion = mo.Evasion,
    Ward = mo.Ward,
    FireResist = mo.FireResist,
    ColdResist = mo.ColdResist,
    LightningResist = mo.LightningResist,
    ChaosResist = mo.ChaosResist,
    FireResistTotal = mo.FireResistTotal,
    ColdResistTotal = mo.ColdResistTotal,
    LightningResistTotal = mo.LightningResistTotal,
    ChaosResistTotal = mo.ChaosResistTotal,
    Speed = mo.Speed,
    CastRate = mo.CastRate,
    CritChance = mo.CritChance,
    CritMultiplier = mo.CritMultiplier,
    BlockChance = mo.BlockChance,
    SpellBlockChance = mo.SpellBlockChance,
    AttackDodgeChance = mo.AttackDodgeChance,
    SpellDodgeChance = mo.SpellDodgeChance,
    MovementSpeedMod = mo.MovementSpeedMod,
    EffectiveMovementSpeedMod = mo.EffectiveMovementSpeedMod,
    PhysicalDamageReduction = mo.PhysicalDamageReduction,
    Accuracy = mo.Accuracy,
    AccuracyHitChance = mo.AccuracyHitChance,
    SpellSuppressionChance = mo.SpellSuppressionChance,
    ArmourDefense = mo.ArmourDefense,
    LifeRegen = mo.LifeRegen,
    EnergyShieldRechargeAppliesToEnergyShield = mo.EnergyShieldRechargeAppliesToEnergyShield,
    EnergyShieldRechargeAppliesToLife = mo.EnergyShieldRechargeAppliesToLife,
    TotalDPS = mo.TotalDPS,
    TotalDotDPS = mo.TotalDotDPS,
    HitChance = mo.HitChance,
    HitSpeed = mo.HitSpeed,
  },
  gems = {},
  items = {},
}

-- Collect gem info
if build.skillsTab and build.skillsTab.skillList then
  for _, group in ipairs(build.skillsTab.skillList) do
    if group.enabled then
      for _, gem in ipairs(group.gems) do
        out.gems[#out.gems + 1] = {
          name = gem.name,
          gemId = gem.gemId,
          level = gem.level,
          quality = gem.quality or 0,
          skillId = gem.skillId,
          mainSkill = group.mainSkill == gem,
        }
      end
    end
  end
end

-- Collect item info
if build.itemsTab and build.itemsTab.activeItemSet then
  local set = build.itemsTab.activeItemSet
  for slotName, slotInfo in pairs(set) do
    if type(slotInfo) == "table" and slotInfo.selItemId and slotInfo.selItemId > 0 then
      local item = build.itemsTab.items[slotInfo.selItemId]
      if item then
        out.items[#out.items + 1] = {
          slot = slotName,
          itemId = slotInfo.selItemId,
          name = item.name,
          baseName = item.baseName,
          rarity = item.rarity,
          type = item.type,
        }
      end
    end
  end
end

local dkjson = require "dkjson"
print(dkjson.encode(out, { indent = false }))
