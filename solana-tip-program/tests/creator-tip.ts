import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CreatorTip } from "../target/types/creator_tip";
import { expect } from "chai";

describe("creator-tip", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CreatorTip as Program<CreatorTip>;
  
  // Test accounts
  const tipper = provider.wallet;
  const creator = anchor.web3.Keypair.generate();
  const platformWallet = anchor.web3.Keypair.generate();

  it("Sends a tip with correct fee split", async () => {
    // Airdrop to tipper
    const airdropSig = await provider.connection.requestAirdrop(
      tipper.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Tip amount: 1 SOL
    const tipAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Expected split
    const expectedPlatformFee = tipAmount.muln(300).divn(10000); // 3%
    const expectedCreatorAmount = tipAmount.sub(expectedPlatformFee); // 97%

    // Get initial balances
    const initialCreatorBalance = await provider.connection.getBalance(
      creator.publicKey
    );
    const initialPlatformBalance = await provider.connection.getBalance(
      platformWallet.publicKey
    );

    // Send tip
    const tx = await program.methods
      .sendTip(tipAmount)
      .accounts({
        tipper: tipper.publicKey,
        creator: creator.publicKey,
        platformWallet: platformWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Get final balances
    const finalCreatorBalance = await provider.connection.getBalance(
      creator.publicKey
    );
    const finalPlatformBalance = await provider.connection.getBalance(
      platformWallet.publicKey
    );

    // Verify creator received correct amount
    expect(finalCreatorBalance - initialCreatorBalance).to.equal(
      expectedCreatorAmount.toNumber()
    );

    // Verify platform received correct fee
    expect(finalPlatformBalance - initialPlatformBalance).to.equal(
      expectedPlatformFee.toNumber()
    );

    console.log("✓ Tip split correctly:");
    console.log(`  Total: ${tipAmount.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL`);
    console.log(`  Creator: ${expectedCreatorAmount.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL (97%)`);
    console.log(`  Platform: ${expectedPlatformFee.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL (3%)`);
  });

  it("Sends a tip with memo", async () => {
    const tipAmount = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL);
    const memo = "Great video! Keep it up 🔥";

    const tx = await program.methods
      .sendTipWithMemo(tipAmount, memo)
      .accounts({
        tipper: tipper.publicKey,
        creator: creator.publicKey,
        platformWallet: platformWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction with memo:", tx);
    console.log("Memo:", memo);
  });

  it("Fails with zero amount", async () => {
    try {
      await program.methods
        .sendTip(new anchor.BN(0))
        .accounts({
          tipper: tipper.publicKey,
          creator: creator.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.toString()).to.include("InvalidAmount");
    }
  });
});
