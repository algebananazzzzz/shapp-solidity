// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./EventSignup.sol";
import "./ShearesToken.sol";

/**
 * @title EventFactory
 * @dev Factory contract for deploying and managing EventSignup contracts.
 */
contract EventFactory {
    address public immutable treasury;
    ShearesToken public immutable token; // Use ShearesToken

    address[] public activeEvents;
    address[] public inactiveEvents;
    mapping(address => bool) public isActiveEvent; // O(1) lookup for active events

    event EventDeployed(address indexed eventAddress);
    event EventArchived(address indexed eventAddress);

    /**
     * @dev Initializes the factory with a ShearesToken contract address.
     * @param _tokenAddress Address of the ShearesToken contract.
     */
    constructor(address _tokenAddress) {
        require(_tokenAddress != address(0), "Invalid token address");

        token = ShearesToken(_tokenAddress);
        treasury = token.treasury();
    }

    /**
     * @dev Creates a new event contract and stores it in `activeEvents`.
     * @param _name Event name.
     * @param _description Event description.
     * @param _maxCapacity Maximum number of attendees.
     * @param _signupStartTime Signup start timestamp.
     * @param _signupEndTime Signup end timestamp.
     * @param _eventStartTime Event start timestamp.
     * @param _eventEndTime Event end timestamp.
     * @param _rewardCost Reward tokens per attendee.
     */
    function createEvent(
        string calldata _name,
        string calldata _description,
        uint16 _maxCapacity,
        uint256 _signupStartTime,
        uint256 _signupEndTime,
        uint256 _eventStartTime,
        uint256 _eventEndTime,
        uint8 _rewardCost
    ) external {
        EventSignup newEvent = new EventSignup(
            _name,
            _description,
            _maxCapacity,
            _signupStartTime,
            _signupEndTime,
            _eventStartTime,
            _eventEndTime,
            _rewardCost,
            address(token)
        );

        // Store the event and mark it as active
        activeEvents.push(address(newEvent));
        isActiveEvent[address(newEvent)] = true;

        // Transfer event ownership to the creator
        newEvent.transferOwnership(msg.sender);

        require(
            token.balanceOf(address(this)) >= _rewardCost * _maxCapacity,
            "Factory has insufficient tokens"
        );

        // Approve the event contract to transfer tokens from the treasury
        token.transfer(address(newEvent), _rewardCost * _maxCapacity);

        emit EventDeployed(address(newEvent));
    }

    /**
     * @dev Moves an active event to the inactive list.
     * This function is separate from deactivation and should be called after deactivation.
     * @param eventAddress Address of the event contract to archive.
     */
    function archiveEvent(address eventAddress) external {
        require(eventAddress != address(0), "Invalid address");
        require(
            isActiveEvent[eventAddress],
            "Event not found or already inactive"
        );

        EventSignup eventItem = EventSignup(eventAddress);

        // Ensure only the event owner can deactivate
        require(
            msg.sender == eventItem.owner(),
            "Ownable: caller is not the owner"
        );

        // Mark event as inactive
        isActiveEvent[eventAddress] = false;
        inactiveEvents.push(eventAddress);

        // Remove event from activeEvents (swap & pop for gas efficiency)
        uint256 index = findEventIndex(eventAddress);
        activeEvents[index] = activeEvents[activeEvents.length - 1];
        activeEvents.pop();

        emit EventArchived(eventAddress);
    }

    /**
     * @dev Finds the index of an event in the activeEvents array.
     * @param eventAddress Address of the event contract.
     * @return uint256 Index of the event in activeEvents.
     */
    function findEventIndex(
        address eventAddress
    ) internal view returns (uint256) {
        for (uint256 i = 0; i < activeEvents.length; i++) {
            if (activeEvents[i] == eventAddress) {
                return i;
            }
        }
        revert("Event not found");
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
