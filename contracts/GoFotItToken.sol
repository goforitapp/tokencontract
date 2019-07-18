pragma solidity 0.5.8;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol';
import 'openzeppelin-solidity/contracts/drafts/TokenVesting.sol';


contract GoForItToken is ERC20Burnable {

    uint constant TOTALTOKENSUPPLY = 12500000000 ether;

    string public name = "Goin Token";
    string public symbol = "GOI";
    uint8 public decimals = 18;

    mapping(address => address) public vestingContracts;

    event TokenVested(address beneficiary, address contractAddress, uint amount);

    /// @dev Constructor
    constructor(address[] memory beneficiaries,
             uint[] memory vestingInDays,
              uint[] memory amounts
              )
              public {
        require(beneficiaries.length == vestingInDays.length &&
                amounts.length == vestingInDays.length,
                "array length does not match");

        for(uint i=0;i<beneficiaries.length;i++) {
            uint vestingDays = vestingInDays[i];
            require(vestingContracts[beneficiaries[i]]== address(0), "only 1 contract per address");
            if(vestingDays>0) {
            TokenVesting vestingContract =new TokenVesting(beneficiaries[i],now,vestingDays* 1 days,vestingInDays[i]* 1 days, false);
            _mint(address(vestingContract),amounts[i]);
            vestingContracts[beneficiaries[i]]=address(vestingContract);
            emit TokenVested(beneficiaries[i],address(vestingContract),amounts[i]);
            }
            else {
            _mint(beneficiaries[i],amounts[i]);
            }

    }
  require(totalSupply()== TOTALTOKENSUPPLY, "totalsupply does not match");
  }

  function release() public {
      require(vestingContracts[msg.sender] != address(0),"no tokens vested");
      TokenVesting(vestingContracts[msg.sender]).release(IERC20(address(this)));
  }




}
