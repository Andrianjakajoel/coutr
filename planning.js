// ==========================================
// PLANNING & CALENDRIER (FullCalendar)
// ==========================================

let calendar = null;

function initialiserCalendrier() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  const evenements = (typeof commandes !== 'undefined' ? commandes : []).map(cmd => ({
    title: `${cmd.client} - ${cmd.modele}`,
    start: cmd.dateLivraison || new Date().toISOString().slice(0, 10),
    color: cmd.reste > 0 ? '#e67e22' : '#27ae60',
    extendedProps: {
      client: cmd.client,
      total: cmd.total,
      reste: cmd.reste
    }
  }));

  if (calendar) {
    calendar.destroy();
  }

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'fr',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    buttonText: {
      today: "Aujourd'hui",
      month: 'Mois',
      week: 'Semaine',
      list: 'Planning'
    },
    events: evenements,
    eventClick: function(info) {
      const props = info.event.extendedProps;
      const totalFmt = typeof formaterAriary === 'function' ? formaterAriary(props.total) : props.total + ' Ar';
      const resteFmt = typeof formaterAriary === 'function' ? formaterAriary(props.reste) : props.reste + ' Ar';
      
      alert(`Client : ${props.client}\nCommande : ${info.event.title}\nTotal : ${totalFmt}\nReste à payer : ${resteFmt}`);
    }
  });

  calendar.render();
}