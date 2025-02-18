// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./WelfareSignup.sol";
import "./Token.sol";

/**
 * @title WelfareFactory
 * @dev Factory contract for deploying and managing WelfareSignup contracts.
 */
contract WelfareFactory {
    address public immutable treasury;
    Token public immutable token; // Use Token

    address[] public activeWelfares;
    address[] public inactiveWelfares;
    mapping(address => bool) public isActiveWelfare; // O(1) lookup for active welfares

    event WelfareDeployed(address indexed welfareAddress);
    event WelfareArchived(address indexed welfareAddress);

    /**
     * @dev Initializes the factory with a Token contract address.
     * @param _tokenAddress Address of the Token contract.
     */
    constructor(address _tokenAddress) {
        require(_tokenAddress != address(0), "Invalid token address");

        token = Token(_tokenAddress);
        treasury = token.treasury();
    }

    /**
     * @dev Creates a new welfare contract and stores it in `activeWelfares`.
     * @param _name Welfare name.
     * @param _description Welfare description.
     * @param _maxCapacity Maximum number of attendees.
     * @param _signupStartTime Signup start timestamp.
     * @param _signupEndTime Signup end timestamp.
     * @param _redemptionEndTime Redemption start timestamp.
     * @param _redemptionCost Cost of tokens per attendee.
     */
    function createWelfare(
        string calldata _name,
        string calldata _description,
        uint16 _maxCapacity,
        uint256 _signupStartTime,
        uint256 _signupEndTime,
        uint256 _redemptionEndTime,
        uint8 _redemptionCost
    ) external {
        WelfareSignup newWelfare = new WelfareSignup(
            _name,
            _description,
            _maxCapacity,
            _signupStartTime,
            _signupEndTime,
            _redemptionEndTime,
            _redemptionCost,
            address(token)
        );

        // Store the welfare and mark it as active
        activeWelfares.push(address(newWelfare));
        isActiveWelfare[address(newWelfare)] = true;

        // Transfer welfare ownership to the creator
        newWelfare.transferOwnership(msg.sender);

        emit WelfareDeployed(address(newWelfare));
    }

    /**
     * @dev Moves an active welfare to the inactive list.
     * This function is separate from deactivation and should be called after deactivation.
     * @param welfareAddress Address of the welfare contract to archive.
     */
    function archiveWelfare(address welfareAddress) external {
        require(welfareAddress != address(0), "Invalid address");
        require(
            isActiveWelfare[welfareAddress],
            "Welfare not found or already inactive"
        );

        WelfareSignup welfareItem = WelfareSignup(welfareAddress);

        // Ensure only the welfare owner can deactivate
        require(
            msg.sender == welfareItem.owner(),
            "Ownable: caller is not the owner"
        );

        // Mark welfare as inactive
        isActiveWelfare[welfareAddress] = false;
        inactiveWelfares.push(welfareAddress);

        // Remove welfare from activeWelfares (swap & pop for gas efficiency)
        uint256 index = findWelfareIndex(welfareAddress);
        activeWelfares[index] = activeWelfares[activeWelfares.length - 1];
        activeWelfares.pop();

        emit WelfareArchived(welfareAddress);
    }

    /**
     * @dev Finds the index of an welfare in the activeWelfares array.
     * @param welfareAddress Address of the welfare contract.
     * @return uint256 Index of the welfare in activeWelfares.
     */
    function findWelfareIndex(
        address welfareAddress
    ) internal view returns (uint256) {
        for (uint256 i = 0; i < activeWelfares.length; i++) {
            if (activeWelfares[i] == welfareAddress) {
                return i;
            }
        }
        revert("Welfare not found");
    }

    /**
     * @dev Returns all active welfare contract addresses.
     */
    function getActiveWelfares() external view returns (address[] memory) {
        return activeWelfares;
    }

    /**
     * @dev Returns all inactive welfare contract addresses.
     */
    function getInactiveWelfares() external view returns (address[] memory) {
        return inactiveWelfares;
    }
}
