-- Extract passive tree node data from PoB tree.lua into JSON
-- Usage: luajit extract-tree-data.lua <tree-version>

local version = arg[1] or "3_27"
local treePath = "D:\\repos\\PathOfBuilding\\src\\TreeData\\" .. version .. "\\tree.lua"

local f = io.open(treePath, "r")
if not f then
    io.stderr:write("ERROR: Cannot open " .. treePath .. "\n")
    os.exit(1)
end

local code = f:read("*all")
f:close()

local fn, err = load(code, treePath)
if not fn then
    io.stderr:write("ERROR loading tree: " .. err .. "\n")
    os.exit(1)
end

local ok, treeData = pcall(fn)
if not ok then
    io.stderr:write("ERROR executing tree: " .. tostring(treeData) .. "\n")
    os.exit(1)
end

local nodes = treeData.nodes
if not nodes then
    io.stderr:write("ERROR: No 'nodes' key in tree data\n")
    os.exit(1)
end

local function jsonEscape(s)
    if type(s) ~= "string" then return "null" end
    local e = s:gsub('\\', '\\\\'):gsub('"', '\\"'):gsub('\n', '\\n'):gsub('\r', '\\r'):gsub('\t', '\\t')
    return '"' .. e .. '"'
end

local entries = {}
local count = 0

for id, node in pairs(nodes) do
    local safeId = tonumber(id)
    if not safeId then
        io.stderr:write("WARN: skipping non-numeric key: " .. tostring(id) .. "\n")
    else
        local nodeType = "Normal"
        if node.isNotable then nodeType = "Notable" end
        if node.isKeystone then nodeType = "Keystone" end
        if node.isMastery then nodeType = "Mastery" end
        if node.isJewelSocket then nodeType = "Socket" end
        if node.isAscendancyStart then nodeType = "AscendancyStart" end

        local statsParts = {}
        if type(node.stats) == "table" then
            for _, s in ipairs(node.stats) do
                if type(s) == "string" and s ~= "" then
                    statsParts[#statsParts + 1] = jsonEscape(s)
                end
            end
        end
        local statsJson = "[" .. table.concat(statsParts, ",") .. "]"

        local nameJson = jsonEscape(node.name)
        local ascJson = jsonEscape(node.ascendancyName)

        entries[#entries + 1] = ('"%d":{%s}'):format(safeId, table.concat({
            '"n":' .. nameJson,
            '"s":' .. statsJson,
            '"t":"' .. nodeType .. '"',
            '"a":' .. ascJson,
        }, ","))
        count = count + 1
    end
end

local json = "{" .. table.concat(entries, ",") .. "}"
io.write(json)
io.stderr:write("\nOK: " .. count .. " nodes extracted from " .. version .. "\n")
