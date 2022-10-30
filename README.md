#Racks
--
Contract
--
    -Logic
        -Holds the main logic of the contracts(organizer and user)
    -Keepers(Bank)
        -Holds all the stakes(eth/nft/token) and also the entry fee
    -Collector
        -Collect all stakes and transfer to Keeper(Bank)
    -contractOrganizer
        -Should also perform the same function with the Organizer buh should be done weekly with keepers assets
<!-- -- -->
Organizer
--
    -Be able to stake (eth/token/nft)
    -Be able to set time for raffle to last
    -Set entry fees(1% goes to the keeper contract for the contract and 99%  to the keepers fot the user if he wins buh if not the gambler)
    -Then generate a vrf for the user
<!-- -- -->
User
--
    -Gamblers should be able to bet and get a random number 
    -Compare random number with the user 
    -if guess is incorrect the gambler should keep betting 
    -if guess is correct the gambler wins all the stakes, 60% of the entry money and 40% of entry money is transfered to the main contracts
    -if time set by user passses all entry eth should be transferred to him and he gets to keep is stakes(meaning he won)
<!-- -- -->
Tools
--
