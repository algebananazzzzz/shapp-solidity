// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./WelfareSignup.sol";

contract WelfareFactory {
    // Arrays for active and inactive welfares (storing only the addresses)
    address[] public activeWelfares;
    address[] public inactiveWelfares;

    event WelfareDeployed(
        address indexed welfareAddress,
        address indexed creator
    );
    event WelfareDeactivated(
        address indexed welfareAddress,
        address indexed deactivator
    );

    /**
     * @dev Creates a new welfare contract and stores its address in the active array.
     */
    function createWelfare(
        string memory _name,
        string memory _description,
        uint16 _maxCapacity,
        uint256 _signupStartTime,
        uint256 _signupEndTime,
        uint256 _redemptionEndTime,
        uint8 _redemptionCost,
        address _tokenAddress
    ) external {
        // Deploy the new welfare contract
        WelfareSignup newWelfare = new WelfareSignup(
            _name,
            _description,
            _maxCapacity,
            _signupStartTime,
            _signupEndTime,
            _redemptionEndTime,
            _redemptionCost,
            _tokenAddress
        );

        // Add to active welfares list
        activeWelfares.push(address(newWelfare));

        // Transfer ownership to the creator
        newWelfare.transferOwnership(msg.sender);

        emit WelfareDeployed(address(newWelfare), msg.sender);
    }

    /**
     * @dev Deactivates a deployed welfare contract and moves it to the inactive array.
     * Only the creator of the contract can deactivate it.
     */
    function deactivateWelfare(address welfareAddress) external {
        require(welfareAddress != address(0), "Invalid address");

        // Check if the welfare is in the active list
        bool found = false;
        uint256 index;

        for (uint256 i = 0; i < activeWelfares.length; i++) {
            if (activeWelfares[i] == welfareAddress) {
                index = i;
                found = true;
                break;
            }
        }

        require(found, "Welfare not found in active list");

        WelfareSignup welfare = WelfareSignup(welfareAddress);
        require(
            msg.sender == welfare.owner(),
            "Only the owner can deactivate this welfare"
        );

        // Deactivate the welfare contract
        welfare.deactivate();

        // Move the welfare to the inactive list
        inactiveWelfares.push(welfareAddress);

        // Remove from active list (swap with the last element and pop)
        activeWelfares[index] = activeWelfares[activeWelfares.length - 1];
        activeWelfares.pop();

        emit WelfareDeactivated(welfareAddress, msg.sender);
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
