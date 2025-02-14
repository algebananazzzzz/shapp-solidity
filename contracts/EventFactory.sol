// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./EventSignup.sol";

contract EventFactory {
    // Arrays for active and inactive events (storing only the addresses)
    address[] public activeEvents;
    address[] public inactiveEvents;

    event EventDeployed(
        address indexed eventAddress,
        address indexed creator
    );
    event EventDeactivated(
        address indexed eventAddress,
        address indexed deactivator
    );

    /**
     * @dev Creates a new event contract and stores its address in the active array.
     */
    function createEvent(
        string memory _name,
        string memory _description,
        uint16 _maxCapacity,
        uint256 _signupStartTime,
        uint256 _signupEndTime,
        uint256 _eventStartTime,
        uint256 _eventEndTime,
        uint8 _rewardCost,
        address _tokenAddress
    ) external {
        // Deploy the new event contract
        EventSignup newEvent = new EventSignup(
            _name,
            _description,
            _maxCapacity,
            _signupStartTime,
            _signupEndTime,
            _eventStartTime,
            _eventEndTime,
            _rewardCost,
            _tokenAddress
        );

        // Add to active events list
        activeEvents.push(address(newEvent));

        // Transfer ownership to the creator
        newEvent.transferOwnership(msg.sender);

        emit EventDeployed(address(newEvent), msg.sender);
    }

    /**
     * @dev Deactivates a deployed event contract and moves it to the inactive array.
     * Only the creator of the contract can deactivate it.
     */
    function deactivateEvent(address eventAddress) external {
        require(eventAddress != address(0), "Invalid address");

        // Check if the event is in the active list
        bool found = false;
        uint256 index;

        for (uint256 i = 0; i < activeEvents.length; i++) {
            if (activeEvents[i] == eventAddress) {
                index = i;
                found = true;
                break;
            }
        }

        require(found, "Event not found in active list");

        EventSignup eventItem = EventSignup(eventAddress);
        require(
            msg.sender == eventItem.owner(),
            "Only the owner can deactivate this event"
        );

        // Deactivate the event contract
        eventItem.deactivate();

        // Move the event to the inactive list
        inactiveEvents.push(eventAddress);

        // Remove from active list (swap with the last element and pop)
        activeEvents[index] = activeEvents[activeEvents.length - 1];
        activeEvents.pop();

        emit EventDeactivated(eventAddress, msg.sender);
    }

    /**
     * @dev Returns all active event contract addresses.
     */
    function getActiveEvents() external view returns (address[] memory) {
        return activeEvents;
    }

    /**
     * @dev Returns all inactive event contract addresses.
     */
    function getInactiveEvents() external view returns (address[] memory) {
        return inactiveEvents;
    }
}
