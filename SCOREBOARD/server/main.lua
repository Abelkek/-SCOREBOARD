local ESX = exports['es_extended']:getSharedObject()

-- Player cache to store duty status and other information
local playerCache = {}

-- Initialize duty status for all players
Citizen.CreateThread(function()
    Citizen.Wait(1000) -- Wait for all resources to load
    
    for _, playerId in ipairs(GetPlayers()) do
        local xPlayer = ESX.GetPlayerFromId(playerId)
        if xPlayer then
            if not playerCache[playerId] then
                playerCache[playerId] = {}
            end
            -- Default to not on duty
            playerCache[playerId].onDuty = false
        end
    end
end)

-- Update player duty status
RegisterNetEvent('scrroebord:updateDutyStatus')
AddEventHandler('scrroebord:updateDutyStatus', function(isDuty)
    local source = source
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer then return end
    
    if not playerCache[source] then
        playerCache[source] = {}
    end
    
    playerCache[source].onDuty = isDuty
    
    -- Broadcast the updated scoreboard
    TriggerClientEvent('scrroebord:updateScoreboard', -1, GetScoreboardData())
end)

-- Get all player data for scoreboard
function GetScoreboardData()
    local players = {}
    local playerCount = 0
    local maxPlayers = GetConvarInt('sv_maxclients', 32)
    
    for _, playerId in ipairs(GetPlayers()) do
        local xPlayer = ESX.GetPlayerFromId(playerId)
        
        if xPlayer then
            playerCount = playerCount + 1
            
            -- Basic player info
            local playerData = {
                serverId = playerId,
                name = GetPlayerName(playerId),
                ping = GetPlayerPing(playerId),
                job = xPlayer.job.name,
                jobGrade = xPlayer.job.grade_name,
                onDuty = playerCache[playerId] and playerCache[playerId].onDuty or false
            }
            
            -- Add admin info if available
            if xPlayer.getGroup() ~= 'user' then
                playerData.adminLevel = xPlayer.getGroup()
            end
            
            -- Add steam info (only for admins to see)
            playerData.identifiers = {}
            for _, identifier in ipairs(GetPlayerIdentifiers(playerId)) do
                if string.sub(identifier, 1, 5) == 'steam' then
                    playerData.identifiers.steam = identifier
                elseif string.sub(identifier, 1, 3) == 'ip' then
                    playerData.identifiers.ip = identifier
                end
            end
            
            table.insert(players, playerData)
        end
    end
    
    return {
        players = players,
        playerCount = playerCount,
        maxPlayers = maxPlayers
    }
end

-- Request scoreboard data from client
RegisterNetEvent('scrroebord:requestScoreboardData')
AddEventHandler('scrroebord:requestScoreboardData', function()
    local source = source
    TriggerClientEvent('scrroebord:updateScoreboard', source, GetScoreboardData())
end)

-- Player connection events to update cache
AddEventHandler('playerDropped', function()
    local source = source
    if playerCache[source] then
        playerCache[source] = nil
    end
    
    -- Update all clients when a player leaves
    TriggerClientEvent('scrroebord:updateScoreboard', -1, GetScoreboardData())
end)

AddEventHandler('esx:playerLoaded', function(playerId, xPlayer)
    -- Initialize player in cache
    if not playerCache[playerId] then
        playerCache[playerId] = {
            onDuty = false
        }
    end
    
    -- Broadcast updated scoreboard when a player joins
    TriggerClientEvent('scrroebord:updateScoreboard', -1, GetScoreboardData())
end)

-- Debug command to check if the resource is working
RegisterCommand('scrroebord_check', function(source, args, rawCommand)
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer and (xPlayer.getGroup() == 'admin' or xPlayer.getGroup() == 'superadmin') then
        print('[Scrroebord] Checking resource status...')
        print('[Scrroebord] Player cache entries: ' .. json.encode(playerCache))
        print('[Scrroebord] Current player count: ' .. #GetPlayers())
        TriggerClientEvent('chat:addMessage', source, {
            color = {255, 0, 0},
            multiline = true,
            args = {'[SYSTEM]', 'Scrroebord status checked. See server console.'}
        })
    end
end, false) 