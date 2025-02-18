// contracts/Token.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract ShearesToken is ERC20, AccessControl, Pausable {
    // Roles for managing the contract
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    address public immutable treasury;

    // Constructor to set the token name, symbol, initial supply, and grant roles
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        treasury = msg.sender;
        _mint(treasury, initialSupply); // Mint initial supply to admin
        _setupRole(DEFAULT_ADMIN_ROLE, treasury);
        _setupRole(MINTER_ROLE, treasury);
        _setupRole(BURNER_ROLE, treasury);
        _setupRole(PAUSER_ROLE, treasury);
    }

    // Function to mint new tokens
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    // Function to burn tokens
    function burn(address from, uint256 amount) public onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    // Function to pause the contract
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    // Function to unpause the contract
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Function to get the circulating supply (total supply minus admin balance)
    function circulatingSupply() public view returns (uint256) {
        return totalSupply() - balanceOf(treasury);
    }

    // Function to get the admin balance
    function adminBalance() public view returns (uint256) {
        return balanceOf(treasury);
    }

    // Override the _beforeTokenTransfer hook to include transfer logic
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
