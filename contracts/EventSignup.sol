// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ShearesToken.sol"; // Import the ShearesToken contract

/**
 * @title EventSignup
 * @dev This contract allows users to sign up for events and get rewarded with ShearesToken upon check-in.
 */
contract EventSignup is Ownable {
    ShearesToken public immutable token; // Immutable reference to the ERC20 token contract

    struct Event {
        string name;
        string description;
        uint16 maxCapacity; // Max number of attendees
        uint16 attendeeCount; // Current number of signed-up attendees
        uint256 signupStartTime; // When signups begin
        uint256 signupEndTime; // When signups end
        uint256 eventStartTime; // When the event begins
        uint256 eventEndTime; // When the event ends
        uint8 rewardCost; // Tokens rewarded for check-in
        bool isActive; // Whether the event is active
    }

    struct AttendeeDetails {
        bool checkedIn; // Whether the user has checked in
        string metadata; // Additional metadata (e.g., attendee details)
    }

    Event public eventDetails; // Store event details
    mapping(address => AttendeeDetails) private attendees; // Store attendees' information
    address[] private attendeeList; // List of attendee addresses (for metadata retrieval)

    // Events for logging
    event SignedUp(address indexed attendee, string metadata);
    event EventCreated(string name, uint16 maxCapacity);
    event Deactivated(address indexed creator);

    /**
     * @dev Constructor initializes the event details and links the ERC20 token.
     * @param _name Name of the event
     * @param _description Description of the event
     * @param _maxCapacity Maximum number of attendees
     * @param _signupStartTime Timestamp when signups start
     * @param _signupEndTime Timestamp when signups end
     * @param _eventStartTime Timestamp when event starts
     * @param _eventEndTime Timestamp when event ends
     * @param _rewardCost Number of tokens rewarded on check-in
     * @param _tokenAddress Address of the ShearesToken contract
     */
    constructor(
        string memory _name,
        string memory _description,
        uint16 _maxCapacity,
        uint256 _signupStartTime,
        uint256 _signupEndTime,
        uint256 _eventStartTime,
        uint256 _eventEndTime,
        uint8 _rewardCost,
        address _tokenAddress
    ) {
        require(_maxCapacity > 0, "Capacity must be greater than 0");
        require(_signupStartTime < _signupEndTime, "Invalid signup time");
        require(
            _signupEndTime < _eventStartTime,
            "Signup must end before event starts"
        );
        require(
            _eventStartTime < _eventEndTime,
            "Event must end after it starts"
        );

        eventDetails = Event({
            name: _name,
            description: _description,
            maxCapacity: _maxCapacity,
            attendeeCount: 0,
            signupStartTime: _signupStartTime,
            signupEndTime: _signupEndTime,
            eventStartTime: _eventStartTime,
            eventEndTime: _eventEndTime,
            rewardCost: _rewardCost,
            isActive: true
        });

        token = ShearesToken(_tokenAddress);

        emit EventCreated(_name, _maxCapacity);
    }

    /**
     * @dev Checks if a user has already signed up for the event.
     * @return bool True if the user is signed up, otherwise false.
     */
    function isAttendee() external view returns (bool) {
        return bytes(attendees[msg.sender].metadata).length > 0;
    }

    /**
     * @dev Allows a user to sign up for the event.
     * @param metadata Additional attendee details (e.g., name, email)
     */
    function signUp(string calldata metadata) external {
        require(eventDetails.isActive, "Event is not active");
        require(
            block.timestamp >= eventDetails.signupStartTime,
            "Signup not started"
        );
        require(block.timestamp < eventDetails.signupEndTime, "Signup ended");
        require(
            eventDetails.attendeeCount < eventDetails.maxCapacity,
            "Event full"
        );
        require(
            bytes(attendees[msg.sender].metadata).length == 0,
            "Already signed up"
        );

        attendees[msg.sender] = AttendeeDetails(false, metadata);
        attendeeList.push(msg.sender);

        unchecked {
            eventDetails.attendeeCount++; // Gas-efficient increment
        }

        emit SignedUp(msg.sender, metadata);
    }

    /**
     * @dev Allows an attendee to check in and receive rewards.
     * @return metadata The metadata string of the attendee.
     */
    function checkIn() external returns (string memory metadata) {
        require(eventDetails.isActive, "Event is not active");
        require(
            block.timestamp >= eventDetails.eventStartTime,
            "Event not started"
        );
        require(block.timestamp < eventDetails.eventEndTime, "Event ended");
        require(
            bytes(attendees[msg.sender].metadata).length > 0,
            "Not signed up"
        );
        require(!attendees[msg.sender].checkedIn, "Already checked in");

        attendees[msg.sender].checkedIn = true;

        // Transfer tokens to the attendee
        require(
            token.transfer(msg.sender, eventDetails.rewardCost),
            "Token transfer failed"
        );

        return attendees[msg.sender].metadata;
    }

    /**
     * @dev Deactivates the event, preventing further signups or check-ins.
     * Only callable by the owner.
     */
    function deactivate() external onlyOwner {
        eventDetails.isActive = false;
        // Get the token balance of this contract
        uint256 balance = token.balanceOf(address(this));

        // Ensure there are tokens to transfer
        if (balance > 0) {
            token.transfer(token.treasury(), balance);
        }
        emit Deactivated(msg.sender);
    }

    /**
     * @dev Retrieves all attendee metadata. Can only be called by the event owner.
     * @return metadataList Array of all attendee metadata
     */
    function getAllMetadata()
        external
        view
        onlyOwner
        returns (string[] memory)
    {
        uint256 count = eventDetails.attendeeCount;
        string[] memory metadataList = new string[](count);

        for (uint256 i; i < count; ) {
            metadataList[i] = attendees[attendeeList[i]].metadata;
            unchecked {
                i++;
            } // Gas-efficient loop
        }

        return metadataList;
    }

    /**
     * @dev Retrieves metadata for a specific attendee.
     * @return metadata The metadata of the given attendee
     */
    function getMetadata() external view returns (string memory metadata) {
        require(
            bytes(attendees[msg.sender].metadata).length > 0,
            "Attendee not found"
        );
        return attendees[msg.sender].metadata;
    }
}
