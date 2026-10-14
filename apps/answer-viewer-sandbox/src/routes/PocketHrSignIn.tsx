/** Glide owns sign-in and row-level access. This standalone iframe cannot verify Glide sessions. */
export function PocketHrSignIn() {
  return <main className="viewer-shell pocket-hr-auth">
    <section className="state-card" role="status">
      <h1>Pocket HR</h1>
      <p>Glide မှာ Login ဝင်ပြီး သင့် Requests ကို Glide App ထဲမှ ကြည့်ပါ။</p>
      <p>ဒီ Web View က Glide Identity ကို အတည်မပြုနိုင်သေးတဲ့အတွက် Request Data ကို မပြထားပါ။</p>
    </section>
  </main>;
}
