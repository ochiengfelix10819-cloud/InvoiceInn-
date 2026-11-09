const $ = id => document.getElementById(id);
const fields = ["businessName","businessEmail","businessPhone","businessAddress","customerName","customerEmail","customerAddress","invoiceNumber","currency","issueDate","dueDate","taxRate","discount","notes"];
let items = [];
let invoices = JSON.parse(localStorage.getItem("invoiceinn_invoices") || "[]");

function today(){return new Date().toISOString().slice(0,10)}
function money(value){const currency=$("currency").value;try{return new Intl.NumberFormat("en-KE",{style:"currency",currency,minimumFractionDigits:2}).format(Number(value)||0)}catch{return currency+" "+(Number(value)||0).toFixed(2)}}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function addItem(description="",qty=1,rate=0){items.push({description,qty,rate});renderItems()}
function renderItems(){
  $("itemsList").innerHTML=items.map((item,i)=>`<div class="item-row">
    <input aria-label="Item description" data-i="${i}" data-k="description" value="${escapeHtml(item.description)}" placeholder="Product or service">
    <input aria-label="Quantity" data-i="${i}" data-k="qty" type="number" min="0" step="1" value="${item.qty}">
    <input aria-label="Rate" data-i="${i}" data-k="rate" type="number" min="0" step="0.01" value="${item.rate}">
    <span class="line-total">${money(item.qty*item.rate)}</span>
    <button type="button" class="remove-item" data-remove="${i}" aria-label="Remove item">×</button>
  </div>`).join("");
  updatePreview();
}
function totals(){
  const subtotal=items.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.rate)||0),0);
  const tax=subtotal*(Math.max(0,Number($("taxRate").value)||0)/100);
  const discount=Math.max(0,Number($("discount").value)||0);
  return {subtotal,tax,discount,total:Math.max(0,subtotal+tax-discount)};
}
function updatePreview(){
  const val=id=>$(id).value.trim();
  $("pBusiness").textContent=val("businessName")||"Your Business";
  $("pBusinessInfo").textContent=[val("businessAddress"),val("businessEmail"),val("businessPhone")].filter(Boolean).join(" • ")||"Business address and contact";
  $("pCustomer").textContent=val("customerName")||"Customer name";
  $("pCustomerInfo").textContent=[val("customerAddress"),val("customerEmail")].filter(Boolean).join(" • ")||"Customer address";
  $("pNumber").textContent=val("invoiceNumber")||"INV-001";
  $("pIssue").textContent=val("issueDate")||"—"; $("pDue").textContent=val("dueDate")||"—";
  $("previewItems").innerHTML=items.length?items.map(x=>`<tr><td>${escapeHtml(x.description||"Item")}</td><td>${Number(x.qty)||0}</td><td>${money(x.rate)}</td><td>${money((Number(x.qty)||0)*(Number(x.rate)||0))}</td></tr>`).join(""):'<tr><td>Service or product</td><td>1</td><td>0.00</td><td>0.00</td></tr>';
  const t=totals();$("pSubtotal").textContent=money(t.subtotal);$("pTax").textContent=money(t.tax);$("pDiscount").textContent=money(t.discount);$("pTotal").textContent=money(t.total);
  $("pNotes").textContent=val("notes")||"Thank you for your business.";
  document.querySelectorAll(".line-total").forEach((el,i)=>el.textContent=money((Number(items[i]?.qty)||0)*(Number(items[i]?.rate)||0)));
}
function refreshDashboard(){
  $("totalCount").textContent=invoices.length;
  $("totalAmount").textContent=money(invoices.reduce((s,x)=>s+x.total,0));
  $("paidCount").textContent=invoices.filter(x=>x.status==="Paid").length;
  $("pendingCount").textContent=invoices.filter(x=>x.status!=="Paid").length;
  $("recentInvoices").innerHTML=invoices.length?invoices.slice().reverse().map(x=>`<tr><td><strong>${escapeHtml(x.number)}</strong></td><td>${escapeHtml(x.customer)}</td><td>${escapeHtml(x.date)}</td><td>${money(x.total)}</td><td><span class="status ${x.status==="Paid"?"paid":""}">${x.status}</span></td><td><button class="table-action" data-toggle="${x.id}">${x.status==="Paid"?"Mark pending":"Mark paid"}</button></td></tr>`).join(""):'<tr><td colspan="6" class="empty-state">No invoices yet. Create your first invoice above.</td></tr>';
}
function resetForm(){
  $("invoiceForm").reset();$("invoiceNumber").value="INV-"+String(Date.now()).slice(-6);$("issueDate").value=today();
  const due=new Date();due.setDate(due.getDate()+14);$("dueDate").value=due.toISOString().slice(0,10);
  items=[{description:"",qty:1,rate:0}];renderItems();
}
$("addItem").addEventListener("click",()=>addItem());
$("itemsList").addEventListener("input",e=>{const i=e.target.dataset.i,k=e.target.dataset.k;if(i===undefined)return;items[Number(i)][k]=k==="description"?e.target.value:Number(e.target.value);updatePreview()});
$("itemsList").addEventListener("click",e=>{if(e.target.dataset.remove!==undefined){items.splice(Number(e.target.dataset.remove),1);if(!items.length)addItem();else renderItems()}});
fields.forEach(id=>$(id).addEventListener("input",updatePreview));
$("currency").addEventListener("change",updatePreview);
$("invoiceForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(!items.length||!items.some(x=>x.description.trim())){alert("Please add at least one item with a description.");return}
  const t=totals(), invoice={id:Date.now(),number:$("invoiceNumber").value,customer:$("customerName").value,date:$("issueDate").value,total:t.total,status:"Pending",currency:$("currency").value,data:Object.fromEntries(fields.map(id=>[id,$(id).value])),items:JSON.parse(JSON.stringify(items)),totals:t};
  invoices.push(invoice);localStorage.setItem("invoiceinn_invoices",JSON.stringify(invoices));refreshDashboard();alert("Invoice saved on this device.");document.getElementById("recent").scrollIntoView({behavior:"smooth"});
});
$("recentInvoices").addEventListener("click",e=>{const id=Number(e.target.dataset.toggle);if(!id)return;const inv=invoices.find(x=>x.id===id);if(inv){inv.status=inv.status==="Paid"?"Pending":"Paid";localStorage.setItem("invoiceinn_invoices",JSON.stringify(invoices));refreshDashboard()}});
$("printInvoice").addEventListener("click",()=>window.print());
$("resetForm").addEventListener("click",resetForm);
$("topCreate").addEventListener("click",()=>{document.getElementById("editor").scrollIntoView({behavior:"smooth"});$("businessName").focus()});
$("year").textContent=new Date().getFullYear();
resetForm();refreshDashboard();
