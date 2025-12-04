import{u as b,r as l,j as e,B as _,ac as y,L as N,S as v,k as u,l as f,m as w,n as S}from"./index-itMr2fPr.js";function P({tasks:c}){const{presses:d}=b(),[t,x]=l.useState(""),h=l.useRef(null),i=s=>{if(!s)return"N/A";const r=new Date(s),a=r.getFullYear(),j=String(r.getMonth()+1).padStart(2,"0"),g=String(r.getDate()).padStart(2,"0");return`${a} /${j}/${g} `},o=()=>{t&&window.print()},p=d.filter(s=>s.active&&!s.archived),n=t?c.filter(s=>s.press===t).reduce((s,r)=>(s[r.category]||(s[r.category]=[]),s[r.category].push(r),s),{}):{},m=Object.keys(n).sort();return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-center justify-between no-print",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-gray-900",children:"Maintenance Checklist"}),e.jsx("p",{className:"text-gray-600 mt-1",children:"Create a printable checklist for press operators"})]}),e.jsxs(_,{onClick:o,className:"gap-2",disabled:!t,children:[e.jsx(y,{className:"w-4 h-4"}),"Print Checklist"]})]}),e.jsx("div",{className:"bg-white rounded-lg border border-gray-200 shadow-sm p-4 no-print",children:e.jsx("div",{className:"grid gap-4 max-w-xs",children:e.jsxs("div",{className:"grid gap-2",children:[e.jsx(N,{children:"Select Press"}),e.jsxs(v,{value:t,onValueChange:s=>x(s),children:[e.jsx(u,{children:e.jsx(f,{placeholder:"Select a press"})}),e.jsx(w,{children:p.map(s=>e.jsx(S,{value:s.name,children:s.name},s.id))})]})]})})}),t&&e.jsxs("div",{ref:h,className:"print-content",children:[e.jsx("style",{children:`
@media print {
  body * {
    visibility: hidden;
  }
    .print - content, .print - content * {
      visibility: visible;
    }
      .print - content {
    position: absolute;
    left: 0;
    top: 0;
    width: 100 %;
  }
              .no - print {
    display: none!important;
  }
  @page {
    size: A4;
    margin: 20mm;
  }
              .checklist - checkbox {
    width: 16px;
    height: 16px;
    border: 2px solid #000;
    display: inline - block;
    margin - right: 8px;
  }
}
`}),e.jsxs("div",{className:"bg-white rounded-lg border border-gray-200 shadow-sm p-6",children:[e.jsxs("div",{className:"border-b border-gray-300 pb-4 mb-6",children:[e.jsx("h1",{className:"text-gray-900 mb-2",children:"Maintenance Checklist"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4 text-gray-600",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Press:"})," ",t]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Date:"})," ",i(new Date)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Operator:"})," ___________________________"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Shift:"})," ___________________________"]})]})]}),m.map(s=>{const r=n[s];return e.jsxs("div",{className:"mb-6 break-inside-avoid",children:[e.jsx("h2",{className:"bg-gray-100 px-3 py-2 mb-3 border border-gray-300",children:s}),e.jsxs("table",{className:"w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b-2 border-gray-300",children:[e.jsx("th",{className:"text-left py-2 px-2 w-12",children:"☐"}),e.jsx("th",{className:"text-left py-2 px-2",children:"Task"}),e.jsx("th",{className:"text-left py-2 px-2 w-32",children:"Last Done"}),e.jsx("th",{className:"text-left py-2 px-2 w-32",children:"Next Due"}),e.jsx("th",{className:"text-left py-2 px-2 w-48",children:"Notes"})]})}),e.jsx("tbody",{children:r.map(a=>e.jsxs("tr",{className:"border-b border-gray-200",children:[e.jsx("td",{className:"py-3 px-2 align-top",children:e.jsx("div",{className:"checklist-checkbox"})}),e.jsx("td",{className:"py-3 px-2",children:e.jsxs("div",{children:[e.jsx("div",{className:"mb-1",children:a.task}),a.taskSubtext&&e.jsx("div",{className:"text-gray-600",children:a.taskSubtext})]})}),e.jsx("td",{className:"py-3 px-2 text-gray-600",children:i(a.lastMaintenance)}),e.jsx("td",{className:"py-3 px-2 text-gray-600",children:i(a.nextMaintenance)}),e.jsx("td",{className:"py-3 px-2",children:e.jsx("div",{className:"border-b border-gray-300 h-6"})})]},a.id))})]})]},s)}),e.jsx("div",{className:"mt-8 pt-4 border-t border-gray-300",children:e.jsxs("div",{className:"grid grid-cols-2 gap-8",children:[e.jsxs("div",{children:[e.jsx("p",{className:"mb-2",children:e.jsx("strong",{children:"Operator Signature:"})}),e.jsx("div",{className:"border-b-2 border-gray-400 h-8"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"mb-2",children:e.jsx("strong",{children:"Supervisor Signature:"})}),e.jsx("div",{className:"border-b-2 border-gray-400 h-8"})]})]})})]})]}),!t&&e.jsx("div",{className:"bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center text-gray-500",children:"Please select a press to generate the checklist"})]})}export{P as MaintenanceChecklist};
