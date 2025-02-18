// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Token.sol"; // Import ShearesToken

contract WelfareSignup is Ownable {
    Token public immutable token;

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
    mapping(address => bool) private attendees;
    mapping(address => bool) private redeemed;

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

        token = Token(_tokenAddress);

        emit WelfareCreated(
            _name,
            _maxCapacity,
            _signupStartTime,
            _signupEndTime,
            _redemptionEndTime,
            _redemptionCost
        );
    }

    /**
     * @dev Checks if a user has already signed up for the welfare.
     * @return bool True if the user is signed up, otherwise false.
     */
    function isAttendee() external view returns (bool) {
        return attendees[msg.sender];
    }

    /**
     * @dev Checks if a user has already redeemed the welfare.
     * @return bool True if the user has redeemed, otherwise false.
     */
    function hasRedeemed() external view returns (bool) {
        return redeemed[msg.sender];
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
            token.allowance(msg.sender, address(this)) >=
                welfareDetails.redemptionCost,
            "Insufficient allowance: Approval for redemption cost not granted"
        );
        require(
            token.transferFrom(
                msg.sender,
                address(this),
                welfareDetails.redemptionCost
            ),
            "Token transfer failed"
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
            token.transfer(token.treasury(), welfareDetails.redemptionCost),
            "Token transfer failed"
        );

        redeemed[msg.sender] = true;
        emit Redeemed(msg.sender);
    }

    function deactivate() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));

        // Ensure there are tokens to transfer
        if (balance > 0) {
            token.transfer(token.treasury(), balance);
        }
        welfareDetails.isActive = false;
        emit Deactivated(msg.sender);
    }
}
