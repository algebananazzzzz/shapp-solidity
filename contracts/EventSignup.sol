// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}

contract EventSignup {
    IERC20 public token;
    address public owner;

    struct Event {
        string name;
        string description;
        uint16 maxCapacity;
        uint256 signupStartTime;
        uint256 signupEndTime;
        uint256 eventStartTime;
        uint256 eventEndTime;
        uint8 rewardCost;
        uint16 attendeeCount;
        bool isActive;
    }

    struct AttendeeDetails {
        string metadata;
        bool checkedIn;
    }

    Event public eventDetails;
    mapping(address => AttendeeDetails) public attendees;
    address[] public addresses;

    event SignedUp(address indexed attendee);
    event EventCreated(
        string name,
        uint16 maxCapacity,
        uint256 signupStartTime,
        uint256 signupEndTime,
        uint256 eventStartTime,
        uint256 eventEndTime
    );
    event CheckedIn(address indexed attendee);
    event Deactivated(address indexed creator);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the creator can perform this action"
        );
        _;
    }

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
        require(
            _signupStartTime < _signupEndTime,
            "Signup start time must be before signup end time"
        );
        require(
            _signupEndTime < _eventStartTime,
            "Signup end time must be before event start time"
        );
        require(
            _eventStartTime < _eventEndTime,
            "Event start time must be before event end time"
        );

        eventDetails = Event({
            name: _name,
            description: _description,
            maxCapacity: _maxCapacity,
            signupStartTime: _signupStartTime,
            signupEndTime: _signupEndTime,
            eventStartTime: _eventStartTime,
            eventEndTime: _eventEndTime,
            rewardCost: _rewardCost,
            attendeeCount: 0,
            isActive: true
        });

        owner = msg.sender;
        token = IERC20(_tokenAddress);

        emit EventCreated(
            _name,
            _maxCapacity,
            _signupStartTime,
            _signupEndTime,
            _eventStartTime,
            _eventEndTime
        );
    }

    function signUp(string memory metadata) external {
        require(eventDetails.isActive, "Event is not active");
        require(
            block.timestamp >= eventDetails.signupStartTime,
            "Signup has not started yet"
        );
        require(
            block.timestamp < eventDetails.signupEndTime,
            "Signup has ended"
        );
        require(
            eventDetails.attendeeCount < eventDetails.maxCapacity,
            "Event is full"
        );
        require(
            bytes(attendees[msg.sender].metadata).length == 0,
            "Already signed up"
        );

        attendees[msg.sender] = AttendeeDetails({
            metadata: metadata,
            checkedIn: false
        });

        addresses.push(msg.sender);

        eventDetails.attendeeCount++;

        emit SignedUp(msg.sender);
    }

    function checkIn() external {
        require(eventDetails.isActive, "Event is not active");
        require(
            block.timestamp >= eventDetails.eventStartTime,
            "Event has not started yet"
        );
        require(block.timestamp < eventDetails.eventEndTime, "Event has ended");
        require(
            bytes(attendees[msg.sender].metadata).length > 0,
            "You are not signed up for the event"
        );
        require(
            !attendees[msg.sender].checkedIn,
            "You have already checked in for the event"
        );

        // Transfer tokens to the user
        require(
            token.transferFrom(owner, msg.sender, eventDetails.rewardCost),
            "Token transfer failed"
        );

        attendees[msg.sender].checkedIn = true;
        emit CheckedIn(msg.sender);
    }

    function deactivate() external onlyOwner {
        eventDetails.isActive = false;
        emit Deactivated(msg.sender);
    }

    /**
     * @dev Allows the current owner to transfer ownership to a new address.
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Allows the owner to retrieve all attendee metadata.
     * Can only be called by the owner.
     * @return metadataList An array of all metadata strings.
     */
    function getAllMetadata()
        external
        view
        onlyOwner
        returns (string[] memory metadataList)
    {
        uint256 attendeeCount = eventDetails.attendeeCount;
        metadataList = new string[](attendeeCount);

        for (uint256 i = 0; i < attendeeCount; i++) {
            metadataList[i] = attendees[addresses[i]].metadata;
        }
    }
}
