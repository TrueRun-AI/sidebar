export const pullPhrases = [
  'go pull', 'go pul', 'pull order', 'pul order', 'pule order', 'order pull', 'authorize pull', 'request pull',
  'dispatch to port', 'dispach to port', 'despatch to port', 'dispatch now', 'send to port immediately',
  'schedule pickup', 'shedul pickup', 'schedule pickup now', 'arrange pickup today',
  'pull container', 'dispatch container', 'release container for pickup', 'send container to',
  'go get container', 'fetch container', 'retrieve container', 'collect container',
  'haul container', 'truck container', 'authorize drayage', 'request drayage', 'initiate drayage',
  'please proceed with pickup', 'confirm pickup for', 'schedule delivery from port', 'en route to facility',
  'delivery scheduled for', 'clear for pickup', 'ready for dispatch', 'approved for release and pull',
  'notify when pulled', 'pull from port', 'dispatch from terminal', 'move from dock', 'transport from yard',
  // Additional from search/variations
  'go pull now', 'dispatch immediately', 'pull today', 'pull asap', 'urgent pull', 'proceed with pull',
  'authorize pickup', 'send truck for', 'dispatch dray', 'go ahead and pull', 'pull tomorrow',
  'schedule pull for', 'confirm pull', 'pull authorized', 'release for pull', 'freight release order',
  'drayage authorization', 'container release order', 'pickup authorization', 'immediate pull order',
  // Typos
  'go pll', 'gopull', 'dispach', 'despatch', 'pikup', 'picup', 'contianer pull', 'pull containr',
  'go pulll', 'pull oder', 'autorize pull', 'reqest pull', 'shedule pickup', 'arange pickup',
  'pull containner', 'despatch containr', 'initate drayage', 'proced with pickup', 'confrm pickup',
  // New from glossaries/searches (35+ additions)
  'booking reservation number', 'provide booking number', 'reservation for pickup', 'drayage from ports',
  'driver assist for load', 'drop and pull', 'drop & pull', 'live load container', 'notify drayage provider',
  'unit available for pickup', 'outgate container', 'confirm pickup number', 'reservation ramp pickup',
  'van grounding ready', 'van notify process', 'dispatch drayman', 'outgate process', 'interchange agreement for pickup',
  'load tender', 'pick-up request', 'pickup order', 'p & d', 'equipment positioning', 'devanning container',
  'drop trailer for loading', 'full containerload pickup', 'fcl pickup', 'less-than-containerload dispatch',
  'lcl dispatch', 'free time for removal', 'offer cargo for transport', 'tender load for pickup',
  // New variations/typos
  'bokking number', 'reservaton for pikup', 'drayge auth', 'drivr assist', 'dropp and pul', 'liv load',
  'notfy drayge', 'outgat containr', 'confrm pikup numbr', 'van grunding', 'dispach dryman', 'lod tendr',
  'pik-up reqest', 'pikup ordr', 'p&d', 'equip positoning', 'devaning contianer', 'dropp traler',
  // Additional from tool-extracted glossaries (40+ new)
  'bill of lading', 'bol for pickup', 'provide bol', 'bol document', 'bill of loading',
  'cartage pickup', 'arrange cartage', 'cartage service', 'cartage transport', 'cartedge delivery',
  'cartage agent', 'subcontract cartage', 'cartage representative', 'cartage agt',
  'customer service representative', 'csr coordinator', 'coordinate pickup', 'csr contact', 'cust service rep',
  'drayage service', 'drayage transport', 'drayage pickup', 'drayge service', 'draige authorization',
  'dray truck', 'dray container', 'dray vehicle', 'draay truck', 'drayage truck now',
  'load tendering', 'load tender', 'tender load', 'bid on load', 'loadtender request',
  'pickup & delivery', 'p&d service', 'pick up and delivery', 'pickup delivery', 'p and d authorization',
  'pickup truck', 'pick-up truck for container', 'pickup vehicle', 'pick up truck now', 'pickuptruck',
  're-consignment', 'reconsignment request', 'transfer to carrier', 'reconsign shipment', 'reconsigment',
  're-route', 'reroute request', 're route shipment', 'rerouting immediately', 'rerout cargo',
  // Immediate/action-oriented variants
  'authorize bol now', 'dispatch cartage asap', 'request dray urgently', 'tender load today',
  'p&d now', 'pickup truck dispatch', 're-consign immediately', 're-route asap'
];

export async function parseBody(bodyText) {
  const upperText = bodyText.toUpperCase();
  const containerRegex = /[A-Z]{4}\d{7}/g;
  const containers = upperText.match(containerRegex) || [];
  const etaRegex = /ETA:\s*([A-Z]+\s*\d{1,2},\s*\d{4})/i;
  const etaMatch = upperText.match(etaRegex);
  const podRegex = /PORT OF DISCHARGE:\s*([\w\s]+)/i;
  const podMatch = upperText.match(podRegex);
  const hasImmediatePull = pullPhrases.some(phrase => {
    const phraseIndex = bodyText.toLowerCase().indexOf(phrase.toLowerCase());
    if (phraseIndex > -1) {
      const snippet = bodyText.substring(Math.max(0, phraseIndex - 100), phraseIndex + 100);
      const hasImmediate = / (now|immediately|today|asap|urgent|right away|promptly|as soon as possible)/i.test(snippet);
      return containers.some(cont => Math.abs(bodyText.indexOf(cont) - phraseIndex) < 100 && hasImmediate);
    }
    return false;
  });
  const containerDetails = [];
  if (hasImmediatePull && containers.length > 0) {
    for (const cont of containers) {
      let details = {
        container_number: cont,
        release_status: 'N/A',
        reason: 'N/A',
        port_discharge: podMatch ? podMatch[1].trim() : 'N/A',
        eta: etaMatch ? etaMatch[1] : 'N/A',
        last_free_day: 'N/A'
      };
      if (process.env.MOCK_MODE === 'true') {  // Demo mode: Fake full data
        details.release_status = Math.random() > 0.5 ? 'Released' : 'Not Released';
        details.reason = details.release_status === 'Released' ? 'Cleared' : 'Hold for docs';
        details.last_free_day = 'Oct 20, 2025';
      } else {
        try {
          // ShipThis real fetch (post-next week)
          const res = await fetch(`http://localhost:5000/api/shipthis_status?container=${cont}`, {
            headers: { 'Authorization': `Bearer ${process.env.SHIPTHIS_API_KEY}` }
          });
          if (!res.ok) throw new Error('ShipThis API failed');
          const data = await res.json();
          details = { ...details, ...data };  // Merge real data
        } catch (err) {
          console.error('ShipThis error:', err);  // Silent log
          details.release_status = 'Unavailable - Check manually';  // Prod fallback
        }
      }
      containerDetails.push(details);
    }
  }
  return {
    containers,
    containerDetails,
    eta: etaMatch ? etaMatch[1] : 'N/A',
    pod: podMatch ? podMatch[1].trim() : 'N/A',
    hasImmediatePull
  };
};

  const containerDetails = [];
  if (hasImmediatePull && containers.length > 0) {
    for (const cont of containers) {
      try {
        const res = await fetch(`https://api.maersk.com/track/v2/container/${cont}`, {
          headers: { 'Authorization': `Bearer ${process.env.MAERSK_API_KEY}` }  // From env
        });
        const data = await res.json();
        containerDetails.push({
          container_number: cont,
          release_status: data.releaseStatus || 'N/A',  // Map to fields
          reason: data.reason || 'N/A',
          port_discharge: data.portOfDischarge || podMatch ? podMatch[1].trim() : 'N/A',
          eta: data.eta || etaMatch ? etaMatch[1] : 'N/A',
          last_free_day: data.lastFreeDay || 'N/A'
        });
      } catch (err) {
        console.error('Maersk fetch error:', err);
      }
    }
  }

  return {
    containers,
    containerDetails,  // New: Detailed array for sidebar
    eta: etaMatch ? etaMatch[1] : 'N/A',
    pod: podMatch ? podMatch[1].trim() : 'N/A',
    hasImmediatePull
  };
};