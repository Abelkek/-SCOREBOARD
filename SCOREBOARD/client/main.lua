local ESX = exports['es_extended']:getSharedObject()
local isScoreboardOpen = false
local scoreboardData = nil
local myJob = nil
local myGroup = nil
local cooldown = false

-- Initialize data when player loads
RegisterNetEvent('esx:playerLoaded')
AddEventHandler('esx:playerLoaded', function(xPlayer)
    myJob = xPlayer.job
    myGroup = xPlayer.getGroup()
    TriggerServerEvent('scrroebord:requestScoreboardData')
end)

-- Update player job when it changes
RegisterNetEvent('esx:setJob')
AddEventHandler('esx:setJob', function(job)
    myJob = job
end)

-- Update scoreboard data from server
RegisterNetEvent('scrroebord:updateScoreboard')
AddEventHandler('scrroebord:updateScoreboard', function(data)
    scoreboardData = data
    
    -- If scoreboard is open, update UI
    if isScoreboardOpen then
        SendNUIMessage({
            action = 'updateScoreboard',
            data = scoreboardData,
            playerJob = myJob,
            playerGroup = myGroup
        })
    end
end)

-- Toggle scoreboard visibility
function ToggleScoreboard()
    -- Prevent rapid toggling
    if cooldown then
        return
    end
    
    -- Set cooldown
    cooldown = true
    Citizen.SetTimeout(300, function()
        cooldown = false
    end)
    
    if not isScoreboardOpen then
        -- Request fresh data and wait for it to arrive before showing UI
        TriggerServerEvent('scrroebord:requestScoreboardData')
        -- Add a small delay to ensure data arrives
        Citizen.SetTimeout(100, function()
            isScoreboardOpen = true
            -- Display UI
            SendNUIMessage({
                action = 'showScoreboard',
                data = scoreboardData,
                playerJob = myJob,
                playerGroup = myGroup
            })
            SetNuiFocus(true, true)
        end)
    else
        isScoreboardOpen = false
        -- Hide UI
        SendNUIMessage({
            action = 'hideScoreboard'
        })
        SetNuiFocus(false, false)
    end
end

-- Close scoreboard when NUI sends close event
RegisterNUICallback('close', function(data, cb)
    if isScoreboardOpen then
        isScoreboardOpen = false
        SendNUIMessage({
            action = 'hideScoreboard'
        })
        SetNuiFocus(false, false)
    end
    if cb then cb('ok') end
end)

-- Preload data periodically to ensure we always have fresh data
Citizen.CreateThread(function()
    while true do
        TriggerServerEvent('scrroebord:requestScoreboardData')
        Citizen.Wait(5000) -- Update every 5 seconds in background
    end
end)

-- Key binding for F10
RegisterCommand('scoreboard', function()
    ToggleScoreboard()
end, false)

-- Direct keybind (alternative method)
Citizen.CreateThread(function()
    local keyPressed = false
    
    while true do
        Citizen.Wait(0)
        -- Check if F10 is pressed (keycode 57)
        if IsControlJustPressed(0, 57) then
            if not keyPressed then
                keyPressed = true
                ToggleScoreboard()
            end
        end
        
        -- Reset key state when released
        if IsControlJustReleased(0, 57) then
            keyPressed = false
        end
    end
end)

RegisterKeyMapping('scoreboard', 'Toggle Scoreboard', 'keyboard', 'F10') 