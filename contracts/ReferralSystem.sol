// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract ReferralSystem {
    mapping(address => address) public referrals;
    mapping(address => uint256) public commissionBalances;
    uint256 public commissionRate = 5; // 5% commission

    event ReferralRegistered(address indexed user, address indexed referrer);
    event CommissionPaid(address indexed referrer, uint256 amount);
    event CommissionWithdrawn(address indexed referrer, uint256 amount);

    function registerReferral(address user, address referrer) external {
        require(user != referrer, "Cannot refer yourself");
        require(referrals[user] == address(0), "Referral already registered");

        referrals[user] = referrer;
        emit ReferralRegistered(user, referrer);
    }

    function payCommission(address user) external {
        address referrer = referrals[user];
        if (referrer != address(0)) {
            uint256 commission = (1 ether * commissionRate) / 100; // Assuming 1 ether for simplicity
            commissionBalances[referrer] += commission;
            emit CommissionPaid(referrer, commission);
        }
    }

    function withdrawCommission() external {
        uint256 commission = commissionBalances[msg.sender];
        require(commission > 0, "No commission to withdraw");

        commissionBalances[msg.sender] = 0;
        payable(msg.sender).transfer(commission);

        emit CommissionWithdrawn(msg.sender, commission);
    }

    receive() external payable {}
}
