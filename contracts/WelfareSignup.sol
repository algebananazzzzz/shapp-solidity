// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}

contract WelfareSignup {
    IERC20 public token;
    address public owner;

    struct Welfare {
        string name;
        string description;
        uint16 maxCapacity;
        uint256 signupStartTime;
        uint256 signupEndTime;
        uint256 redemptionEndTime;
        uint8 redemptionCost;
        uint16 attendeeCount;
        bool isActive;
    }

    Welfare public welfareDetails;
    mapping(address => bool) public attendees;
    mapping(address => bool) public redeemed;

    event SignedUp(address indexed attendee);
    event WelfareCreated(
        string name,
        uint16 maxCapacity,
        uint256 signupStartTime,
        uint256 signupEndTime,
        uint256 redemptionEndTime,
        uint8 redemptionCost
    );
    event Redeemed(address indexed attendee);
    event Deactivated(address indexed creator);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    constructor(
        string memory _name,
        string memory _description,
        uint16 _maxCapacity,
        uint256 _signupStartTime,
        uint256 _signupEndTime,
        uint256 _redemptionEndTime,
        uint8 _redemptionCost,
        address _tokenAddress
    ) {
        require(_maxCapacity > 0, "Capacity must be greater than 0");
        require(
            _signupStartTime < _signupEndTime,
            "Signup start time must be before signup end time"
        );
        require(
            _signupEndTime < _redemptionEndTime,
            "Signup end time must be before redemption end time"
        );

        welfareDetails = Welfare({
            name: _name,
            description: _description,
            maxCapacity: _maxCapacity,
            signupStartTime: _signupStartTime,
            signupEndTime: _signupEndTime,
            redemptionEndTime: _redemptionEndTime,
            redemptionCost: _redemptionCost,
            attendeeCount: 0,
            isActive: true
        });

        owner = msg.sender;
        token = IERC20(_tokenAddress);

        emit WelfareCreated(
            _name,
            _maxCapacity,
            _signupStartTime,
            _signupEndTime,
            _redemptionEndTime,
            _redemptionCost
        );
    }

    function signUp() external {
        require(welfareDetails.isActive, "Welfare is not active");
        require(
            block.timestamp >= welfareDetails.signupStartTime,
            "Signup has not started yet"
        );
        require(
            block.timestamp < welfareDetails.signupEndTime,
            "Signup has ended"
        );
        require(
            welfareDetails.attendeeCount < welfareDetails.maxCapacity,
            "Welfare is full"
        );
        require(!attendees[msg.sender], "Already signed up");
        require(
            token.balanceOf(msg.sender) >= welfareDetails.redemptionCost,
            "Insufficient balance: Not enough tokens to redeem welfare"
        );
        require(
            token.allowance(msg.sender, address(this)) >=
                welfareDetails.redemptionCost,
            "Insufficient allowance: Approval for redemption cost not granted"
        );

        attendees[msg.sender] = true;
        welfareDetails.attendeeCount++;
        emit SignedUp(msg.sender);
    }

    function redeem() external {
        require(welfareDetails.isActive, "Welfare is not active");
        require(
            block.timestamp < welfareDetails.redemptionEndTime,
            "Redemption time has ended"
        );
        require(attendees[msg.sender], "You are not signed up for the welfare");
        require(!redeemed[msg.sender], "You have already redeemed your reward");
        // Transfer tokens to the creator
        require(
            token.transferFrom(
                msg.sender,
                owner,
                welfareDetails.redemptionCost
            ),
            "Token transfer failed"
        );

        redeemed[msg.sender] = true;
        emit Redeemed(msg.sender);
    }

    function deactivate() external onlyOwner {
        welfareDetails.isActive = false;
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
}
